<?php
/**
 * Plugin Name: Marine World Booking System
 * Plugin URI: https://marineworld.in
 * Description: Complete booking system for Marine World with React-powered frontend and Elementor integration
 * Version: 1.1.0
 * Author: Calpar Global
 * License: GPL v2 or later
 * Text Domain: marine-world-booking
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('MWB_PLUGIN_URL', plugin_dir_url(__FILE__));
define('MWB_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('MWB_VERSION', '1.1.0');
define('MWB_MINIMUM_WP_VERSION', '5.0');
define('MWB_MINIMUM_PHP_VERSION', '7.4');

/**
 * Main Marine World Booking Plugin Class
 */
class MarineWorldBooking {
    
    private static $instance = null;
    private $database = null;
    private $rest_api = null;
    private $booking_manager = null;
    private $payment_handler = null;
    private $notification_manager = null;
    
    /**
     * Singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        // Check requirements
        if (!$this->check_requirements()) {
            return;
        }
        
        $this->init_hooks();
    }
    
    /**
     * Check plugin requirements
     */
    private function check_requirements() {
        global $wp_version;
        
        // Check WordPress version
        if (version_compare($wp_version, MWB_MINIMUM_WP_VERSION, '<')) {
            add_action('admin_notices', array($this, 'wp_version_notice'));
            return false;
        }
        
        // Check PHP version
        if (version_compare(phpversion(), MWB_MINIMUM_PHP_VERSION, '<')) {
            add_action('admin_notices', array($this, 'php_version_notice'));
            return false;
        }
        
        return true;
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('init', array($this, 'init'), 0);
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // REST API
        add_action('rest_api_init', array($this, 'init_rest_api'));
        
        // Shortcodes
        add_shortcode('marine_world_booking', array($this, 'booking_shortcode'));
        add_shortcode('marine_world_calendar', array($this, 'calendar_shortcode'));
        
        // Elementor integration
        add_action('elementor/widgets/widgets_registered', array($this, 'register_elementor_widgets'));
        
        // Footer modal
        add_action('wp_footer', array($this, 'add_booking_modal'));
        
        // Activation/Deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        register_uninstall_hook(__FILE__, array('MarineWorldBooking', 'uninstall'));
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        $this->load_dependencies();
        $this->init_components();
    }
    
    /**
     * Load plugin dependencies
     */
    private function load_dependencies() {
        // Core classes
        require_once MWB_PLUGIN_PATH . 'includes/class-database.php';
        require_once MWB_PLUGIN_PATH . 'includes/class-rest-api.php';
        require_once MWB_PLUGIN_PATH . 'includes/class-booking-manager.php';
        require_once MWB_PLUGIN_PATH . 'includes/class-payment-handler.php';
        require_once MWB_PLUGIN_PATH . 'includes/class-notification-manager.php';
        
        // Admin classes - Load admin dashboard for both admin and frontend admin panel
        if (is_admin() || wp_doing_ajax() || $this->is_frontend_admin_request()) {
            require_once MWB_PLUGIN_PATH . 'admin/class-admin-dashboard.php';
            // The admin dashboard will handle all menu creation and AJAX handlers
        }
        
        // Elementor widgets
        if (did_action('elementor/loaded')) {
            require_once MWB_PLUGIN_PATH . 'includes/elementor-widgets/class-booking-widget.php';
            require_once MWB_PLUGIN_PATH . 'includes/elementor-widgets/class-admin-panel-widget.php';
        }
    }
    
    /**
     * Check if this is a frontend admin request
     */
    private function is_frontend_admin_request() {
        // Check if we're on a page that might contain the frontend admin widget
        // This is a simple check - you might want to make it more specific
        return !is_admin() && (isset($_POST['action']) && strpos($_POST['action'], 'mwb_') === 0);
    }
    
    /**
     * Initialize plugin components
     */
    private function init_components() {
        // Initialize database
        if (class_exists('MWB_Database')) {
            $this->database = new MWB_Database();
            $this->database->init();
        }
        
        // Initialize other components
        if (class_exists('MWB_REST_API')) {
            $this->rest_api = new MWB_REST_API();
            $this->rest_api->init();
        }
        
        if (class_exists('MWB_Booking_Manager')) {
            $this->booking_manager = new MWB_Booking_Manager();
        }
        
        if (class_exists('MWB_Payment_Handler')) {
            $this->payment_handler = new MWB_Payment_Handler();
        }
        
        if (class_exists('MWB_Notification_Manager')) {
            $this->notification_manager = new MWB_Notification_Manager();
        }
    }
    
    /**
     * Load text domain for translations
     */
    public function load_textdomain() {
        load_plugin_textdomain(
            'marine-world-booking',
            false,
            dirname(plugin_basename(__FILE__)) . '/languages/'
        );
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        // React dependencies
        wp_enqueue_script(
            'react',
            'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
            array(),
            '18.2.0',
            true
        );
        
        wp_enqueue_script(
            'react-dom',
            'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
            array('react'),
            '18.2.0',
            true
        );
        
        // Main booking app
        wp_enqueue_script(
            'marine-world-booking-app',
            MWB_PLUGIN_URL . 'assets/js/booking-app.js',
            array('react', 'react-dom'),
            MWB_VERSION,
            true
        );
        
        // Booking styles
        wp_enqueue_style(
            'marine-world-booking-styles',
            MWB_PLUGIN_URL . 'assets/css/booking-styles.css',
            array(),
            MWB_VERSION
        );
        
        // Frontend admin styles (for Elementor admin panel widget)
        wp_enqueue_style(
            'marine-world-admin-styles',
            MWB_PLUGIN_URL . 'assets/css/frontend-admin.css',
            array(),
            MWB_VERSION
        );
        
        // Frontend admin script (for Elementor admin panel widget)
        wp_enqueue_script(
            'marine-world-admin',
            MWB_PLUGIN_URL . 'assets/js/frontend-admin.js',
            array('react', 'react-dom'),
            MWB_VERSION,
            true
        );
        
        // Check payment gateway configuration
        $merchant_id = get_option('mwb_icici_merchant_id', '');
        $access_code = get_option('mwb_icici_access_code', '');
        $working_key = get_option('mwb_icici_working_key', '');
        $test_mode = get_option('mwb_icici_test_mode', 'yes') === 'yes';
        
        // Localize script with configuration
        $localization_data = array(
            'apiUrl' => rest_url('marine-world/v1/'),
            'nonce' => wp_create_nonce('wp_rest'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'currency' => get_option('mwb_currency', '₹'),
            'dateFormat' => get_option('date_format', 'Y-m-d'),
            'maxAdvanceDays' => get_option('mwb_max_advance_booking_days', 60),
            'testMode' => $test_mode,
            'gatewayKeys' => array(
                'merchant_id' => !empty($merchant_id),
                'access_code' => !empty($access_code),
                'working_key' => !empty($working_key)
            ),
            'tickets' => $this->get_ticket_types(),
            'addons' => $this->get_addon_data(),
            'groupDiscounts' => $this->get_group_discounts(),
            'locations' => $this->get_locations_data(),
            'strings' => array(
                'loading' => __('Loading...', 'marine-world-booking'),
                'bookNow' => __('Book Now', 'marine-world-booking'),
                'selectDate' => __('Select Date', 'marine-world-booking'),
                'selectTickets' => __('Select Tickets', 'marine-world-booking'),
                'soldOut' => __('Sold Out', 'marine-world-booking'),
                'available' => __('Available', 'marine-world-booking'),
                'limited' => __('Limited', 'marine-world-booking'),
            )
        );
        
        // Localize both booking app and frontend admin scripts
        wp_localize_script('marine-world-booking-app', 'marineWorldBooking', $localization_data);
        wp_localize_script('marine-world-admin', 'marineWorldBooking', $localization_data);
    }
    
    /**
     * Initialize REST API
     */
    public function init_rest_api() {
        if ($this->rest_api) {
            $this->rest_api->init();
        }
    }
    
    /**
     * Register Elementor widgets
     */
    public function register_elementor_widgets() {
        if (class_exists('MWB_Booking_Widget')) {
            \Elementor\Plugin::instance()->widgets_manager->register_widget_type(
                new MWB_Booking_Widget()
            );
        }
        
        if (class_exists('MWB_Admin_Panel_Widget')) {
            \Elementor\Plugin::instance()->widgets_manager->register_widget_type(
                new MWB_Admin_Panel_Widget()
            );
        }
    }
    
    /**
     * Booking shortcode
     */
    public function booking_shortcode($atts) {
        $atts = shortcode_atts(array(
            'location' => '',
            'theme' => 'default',
            'steps' => 'all',
            'type' => 'full'
        ), $atts, 'marine_world_booking');
        
        $unique_id = 'mwb-booking-' . wp_rand(1000, 9999);
        
        // Ensure scripts are loaded
        if (!wp_script_is('marine-world-booking-app', 'enqueued')) {
            $this->enqueue_scripts();
        }
        
        $output = sprintf(
            '<div id="%s" class="marine-world-booking-container" data-location="%s" data-theme="%s" data-steps="%s" data-type="%s">',
            esc_attr($unique_id),
            esc_attr($atts['location']),
            esc_attr($atts['theme']),
            esc_attr($atts['steps']),
            esc_attr($atts['type'])
        );
        
        $output .= '<div class="mwb-loading">';
        $output .= '<div class="mwb-spinner"></div>';
        $output .= '<p>' . __('Loading Marine World Booking System...', 'marine-world-booking') . '</p>';
        $output .= '</div>';
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Calendar shortcode
     */
    public function calendar_shortcode($atts) {
        $atts = shortcode_atts(array(
            'location' => '',
            'view' => 'month',
            'theme' => 'default'
        ), $atts, 'marine_world_calendar');
        
        $unique_id = 'mwb-calendar-' . wp_rand(1000, 9999);
        
        // Ensure scripts are loaded
        if (!wp_script_is('marine-world-booking-app', 'enqueued')) {
            $this->enqueue_scripts();
        }
        
        $output = sprintf(
            '<div id="%s" class="marine-world-calendar-container" data-location="%s" data-view="%s" data-theme="%s">',
            esc_attr($unique_id),
            esc_attr($atts['location']),
            esc_attr($atts['view']),
            esc_attr($atts['theme'])
        );
        
        $output .= '<div class="mwb-loading">';
        $output .= '<div class="mwb-spinner"></div>';
        $output .= '<p>' . __('Loading Calendar...', 'marine-world-booking') . '</p>';
        $output .= '</div>';
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Add booking modal to footer
     */
    public function add_booking_modal() {
        echo '<div id="marine-world-booking-modal" class="mwb-modal" style="display: none;"></div>';
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Create database tables
        if ($this->database) {
            $this->database->create_tables();
            $this->database->insert_default_data();
        }
        
        // Create upload directories
        $this->create_upload_directories();
        
        // Add default options
        $this->add_default_options();
        
        // Schedule cron jobs
        $this->schedule_cron_jobs();
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clear scheduled hooks
        wp_clear_scheduled_hook('mwb_cleanup_expired_bookings');
        wp_clear_scheduled_hook('mwb_update_availability_status');
        wp_clear_scheduled_hook('mwb_daily_reminders');
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin uninstall
     */
    public static function uninstall() {
        // Remove database tables
        global $wpdb;
        
        $tables = array(
            $wpdb->prefix . 'mwb_bookings',
            $wpdb->prefix . 'mwb_availability',
            $wpdb->prefix . 'mwb_locations',
            $wpdb->prefix . 'mwb_addons',
            $wpdb->prefix . 'mwb_promo_codes'
        );
        
        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS {$table}");
        }
        
        // Remove options
        $options = array(
            'mwb_default_capacity',
            'mwb_max_advance_booking_days',
            'mwb_group_discount_15',
            'mwb_group_discount_30',
            'mwb_icici_merchant_id',
            'mwb_icici_access_code',
            'mwb_icici_working_key',
            'mwb_icici_test_mode',
            'mwb_currency'
        );
        
        foreach ($options as $option) {
            delete_option($option);
        }
        
        // Remove upload directories
        $upload_dir = wp_upload_dir();
        $ticket_dir = $upload_dir['basedir'] . '/marine-world-tickets';
        if (file_exists($ticket_dir)) {
            wp_delete_file($ticket_dir);
        }
    }
    
    /**
     * Helper methods
     */
    private function create_upload_directories() {
        $upload_dir = wp_upload_dir();
        $ticket_dir = $upload_dir['basedir'] . '/marine-world-tickets';
        
        if (!file_exists($ticket_dir)) {
            wp_mkdir_p($ticket_dir);
            
            // Add .htaccess for security
            $htaccess_content = "Options -Indexes\n<Files *.php>\nOrder allow,deny\nDeny from all\n</Files>";
            file_put_contents($ticket_dir . '/.htaccess', $htaccess_content);
        }
    }
    
    private function add_default_options() {
        add_option('mwb_default_capacity', 1000);
        add_option('mwb_max_advance_booking_days', 60);
        add_option('mwb_group_discount_15', 5);
        add_option('mwb_group_discount_30', 10);
        add_option('mwb_currency', '₹');
        add_option('mwb_icici_test_mode', 'yes');
    }
    
    private function schedule_cron_jobs() {
        // Schedule cleanup of expired bookings
        if (!wp_next_scheduled('mwb_cleanup_expired_bookings')) {
            wp_schedule_event(time(), 'hourly', 'mwb_cleanup_expired_bookings');
        }
        
        // Schedule availability status updates
        if (!wp_next_scheduled('mwb_update_availability_status')) {
            wp_schedule_event(time(), 'twicedaily', 'mwb_update_availability_status');
        }
        
        // Schedule daily reminders
        if (!wp_next_scheduled('mwb_daily_reminders')) {
            wp_schedule_event(time(), 'daily', 'mwb_daily_reminders');
        }
    }
    
    private function get_ticket_types() {
        return array(
            'general' => array('name' => __('General', 'marine-world-booking'), 'price' => 400),
            'child' => array('name' => __('Child', 'marine-world-booking'), 'price' => 280),
            'senior' => array('name' => __('Senior Citizen', 'marine-world-booking'), 'price' => 350)
        );
    }
    
    private function get_addon_data() {
        if ($this->database) {
            $addons = $this->database->get_addons(); // Only get active add-ons
            $formatted = array();
            foreach ($addons as $addon) {
                $formatted[$addon->id] = array(
                    'id' => (int) $addon->id,
                    'name' => $addon->name,
                    'description' => $addon->description,
                    'price' => (float) $addon->price,
                    'display_order' => (int) $addon->display_order
                );
            }
            return $formatted;
        }
        
        // Fallback data if database is not available
        return array(
            '1' => array('id' => 1, 'name' => __('Horror House 16D', 'marine-world-booking'), 'description' => __('Experience the ultimate thrill', 'marine-world-booking'), 'price' => 120, 'display_order' => 1),
            '2' => array('id' => 2, 'name' => __('Mirror Maze', 'marine-world-booking'), 'description' => __('Navigate through our challenging mirror maze', 'marine-world-booking'), 'price' => 120, 'display_order' => 2),
            '3' => array('id' => 3, 'name' => __('Birds Park', 'marine-world-booking'), 'description' => __('Explore our beautiful collection of exotic birds', 'marine-world-booking'), 'price' => 120, 'display_order' => 3),
            '4' => array('id' => 4, 'name' => __('Children\'s Park', 'marine-world-booking'), 'description' => __('Fun-filled activities for children', 'marine-world-booking'), 'price' => 120, 'display_order' => 4),
            '5' => array('id' => 5, 'name' => __('Train Rides', 'marine-world-booking'), 'description' => __('Exciting train rides around Marine World', 'marine-world-booking'), 'price' => 120, 'display_order' => 5)
        );
    }
    
    private function get_group_discounts() {
        return array(
            15 => get_option('mwb_group_discount_15', 5),
            30 => get_option('mwb_group_discount_30', 10)
        );
    }
    
    private function get_locations_data() {
        if ($this->database) {
            return $this->database->get_locations();
        }
        return array();
    }
    
    /**
     * Version notices
     */
    public function wp_version_notice() {
        echo '<div class="notice notice-error"><p>';
        printf(
            __('Marine World Booking requires WordPress %s or higher. Please update WordPress.', 'marine-world-booking'),
            MWB_MINIMUM_WP_VERSION
        );
        echo '</p></div>';
    }
    
    public function php_version_notice() {
        echo '<div class="notice notice-error"><p>';
        printf(
            __('Marine World Booking requires PHP %s or higher. Please update PHP.', 'marine-world-booking'),
            MWB_MINIMUM_PHP_VERSION
        );
        echo '</p></div>';
    }
}

/**
 * Initialize the plugin
 */
function marine_world_booking_init() {
    return MarineWorldBooking::get_instance();
}

// Start the plugin
add_action('plugins_loaded', 'marine_world_booking_init');

/**
 * Quick demo shortcode for testing
 */
add_shortcode('marine_world_demo', function($atts) {
    $atts = shortcode_atts(array(
        'title' => 'Marine World Booking System'
    ), $atts);
    
    return sprintf(
        '<div style="padding: 20px; border: 2px solid #007cba; border-radius: 8px; text-align: center; background: #f0f8ff;">
            <h3>🌊 %s</h3>
            <p>Your booking system is successfully installed!</p>
            <p>Use <code>[marine_world_booking]</code> for the full booking system.</p>
            <p>Use <code>[marine_world_calendar]</code> for calendar only.</p>
            <button style="background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;" onclick="alert(\'Booking system is ready!\')">Test Plugin</button>
        </div>',
        esc_html($atts['title'])
    );
});
?>
