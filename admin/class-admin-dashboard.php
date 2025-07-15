<?php

class MWB_Admin_Dashboard {
    
    private $database;
    private $booking_manager;
    private $payment_handler;
    
    public function __construct() {
        $this->database = new MWB_Database();
        $this->booking_manager = new MWB_Booking_Manager();
        $this->payment_handler = new MWB_Payment_Handler();
        
        $this->init_hooks();
    }
    
    private function init_hooks() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        // Only enqueue admin scripts on actual admin pages, not frontend
        if (is_admin()) {
            add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        }
        add_action('admin_init', array($this, 'register_settings'));
        
        // AJAX handlers for admin actions
        add_action('wp_ajax_mwb_get_dashboard_stats', array($this, 'get_dashboard_stats'));
        add_action('wp_ajax_mwb_get_bookings_list', array($this, 'get_bookings_list'));
        add_action('wp_ajax_mwb_get_availability_data', array($this, 'get_availability_data'));
        add_action('wp_ajax_mwb_update_availability', array($this, 'update_availability'));
        add_action('wp_ajax_mwb_export_bookings', array($this, 'export_bookings'));
        add_action('wp_ajax_mwb_bulk_action_bookings', array($this, 'bulk_action_bookings'));
        add_action('wp_ajax_mwb_get_settings', array($this, 'get_settings'));
        add_action('wp_ajax_mwb_save_settings', array($this, 'save_settings'));
        add_action('wp_ajax_mwb_get_ticket_prices', array($this, 'get_ticket_prices'));
        add_action('wp_ajax_mwb_update_ticket_prices', array($this, 'update_ticket_prices'));
        add_action('wp_ajax_mwb_reset_ticket_prices', array($this, 'reset_ticket_prices'));
        
        // Location management AJAX handlers
        add_action('wp_ajax_mwb_get_locations_list', array($this, 'get_locations_list'));
        add_action('wp_ajax_mwb_get_location', array($this, 'get_location'));
        add_action('wp_ajax_mwb_save_location', array($this, 'save_location'));
        add_action('wp_ajax_mwb_delete_location', array($this, 'delete_location'));
        add_action('wp_ajax_mwb_bulk_action_locations', array($this, 'bulk_action_locations'));
        add_action('wp_ajax_mwb_get_location_stats', array($this, 'get_location_stats'));
        
        // Add-ons management AJAX handlers
        add_action('wp_ajax_mwb_get_addons_list', array($this, 'get_addons_list'));
        add_action('wp_ajax_mwb_get_addon', array($this, 'get_addon'));
        add_action('wp_ajax_mwb_save_addon', array($this, 'save_addon'));
        add_action('wp_ajax_mwb_delete_addon', array($this, 'delete_addon'));
        add_action('wp_ajax_mwb_bulk_action_addons', array($this, 'bulk_action_addons'));
        add_action('wp_ajax_mwb_update_addon_order', array($this, 'update_addon_order'));
        add_action('wp_ajax_mwb_get_addon_stats', array($this, 'get_addon_stats'));
        
        // Promo codes management AJAX handlers
        add_action('wp_ajax_mwb_get_promo_codes_list', array($this, 'get_promo_codes_list'));
        add_action('wp_ajax_mwb_get_promo_code', array($this, 'get_promo_code'));
        add_action('wp_ajax_mwb_save_promo_code', array($this, 'save_promo_code'));
        add_action('wp_ajax_mwb_delete_promo_code', array($this, 'delete_promo_code'));
        add_action('wp_ajax_mwb_bulk_action_promo_codes', array($this, 'bulk_action_promo_codes'));
        
        // Birthday offers management AJAX handlers
        add_action('wp_ajax_mwb_get_birthday_offers', array($this, 'get_birthday_offers'));
        add_action('wp_ajax_mwb_get_birthday_offer', array($this, 'get_birthday_offer'));
        add_action('wp_ajax_mwb_save_birthday_offer', array($this, 'save_birthday_offer'));
        add_action('wp_ajax_mwb_delete_birthday_offer', array($this, 'delete_birthday_offer'));
        
        // Debug action for testing
        add_action('wp_ajax_mwb_test_locations', array($this, 'test_locations_system'));
        
        // Clear all bookings for testing
        add_action('wp_ajax_mwb_clear_all_bookings', array($this, 'clear_all_bookings'));
        
        // Add frontend-compatible AJAX handlers for logged-in users
        $this->add_frontend_ajax_handlers();
    }
    
    /**
     * Add frontend-compatible AJAX handlers for logged-in users with proper capabilities
     */
    private function add_frontend_ajax_handlers() {
        // Add frontend AJAX handlers - these will work alongside the existing admin handlers
        // We modify the existing handlers to work with both admin and frontend nonces
        $handlers = [
            'mwb_get_dashboard_stats',
            'mwb_get_bookings_list', 
            'mwb_get_availability_data',
            'mwb_update_availability',
            'mwb_get_settings',
            'mwb_save_settings',
            'mwb_get_locations_list',
            'mwb_get_location',
            'mwb_save_location',
            'mwb_delete_location',
            'mwb_get_addons_list',
            'mwb_get_addon',
            'mwb_save_addon',
            'mwb_delete_addon',
            'mwb_get_promo_codes_list',
            'mwb_get_promo_code',
            'mwb_save_promo_code',
            'mwb_delete_promo_code',
            'mwb_bulk_action_promo_codes',
            'mwb_get_birthday_offers',
            'mwb_get_birthday_offer',
            'mwb_save_birthday_offer',
            'mwb_delete_birthday_offer',
            'mwb_get_ticket_prices',
            'mwb_update_ticket_prices',
            'mwb_export_bookings',
            'mwb_bulk_action_bookings'
        ];
        
        // Add wp_ajax_nopriv_ handlers that redirect to the same methods
        // This allows logged-in frontend users to access the same functionality
        foreach ($handlers as $handler) {
            add_action("wp_ajax_nopriv_{$handler}", array($this, str_replace('mwb_', '', $handler)));
        }
    }
    
    /**
     * Enhanced nonce verification that works for both admin and frontend
     */
    private function verify_admin_nonce() {
        // Try admin nonce first
        if (isset($_POST['nonce']) && wp_verify_nonce($_POST['nonce'], 'mwb_admin_nonce')) {
            return true;
        }
        
        // Try REST nonce for frontend
        if (isset($_POST['nonce']) && wp_verify_nonce($_POST['nonce'], 'wp_rest')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Enhanced capability check that works for both admin and frontend
     */
    private function check_user_capability($min_capability = 'edit_posts') {
        if (!is_user_logged_in()) {
            return false;
        }
        
        // For admin area, require manage_options
        if (is_admin() && !current_user_can('manage_options')) {
            return false;
        }
        
        // For frontend, check the minimum capability
        if (!is_admin() && !current_user_can($min_capability)) {
            return false;
        }
        
        return true;
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'Marine World Booking',
            'Marine World',
            'manage_options',
            'marine-world-booking',
            array($this, 'render_dashboard_page'),
            'dashicons-calendar-alt',
            30
        );
        
        add_submenu_page(
            'marine-world-booking',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'marine-world-booking',
            array($this, 'render_dashboard_page')
        );
        
        add_submenu_page(
            'marine-world-booking',
            'Bookings',
            'Bookings',
            'manage_options',
            'marine-world-bookings',
            array($this, 'render_bookings_page')
        );
        
        add_submenu_page(
            'marine-world-booking',
            'Availability',
            'Availability',
            'manage_options',
            'marine-world-availability',
            array($this, 'render_availability_page')
        );
        
        add_submenu_page(
            'marine-world-booking',
            'Analytics',
            'Analytics',
            'manage_options',
            'marine-world-analytics',
            array($this, 'render_analytics_page')
        );
        
        add_submenu_page(
            'marine-world-booking',
            'Settings',
            'Settings',
            'manage_options',
            'marine-world-settings',
            array($this, 'render_settings_page')
        );
        
        add_submenu_page(
            'marine-world-booking',
            'Add-ons',
            'Add-ons',
            'manage_options',
            'marine-world-addons',
            array($this, 'render_addons_page')
        );
        
        add_submenu_page(
            'marine-world-booking',
            'Locations',
            'Locations',
            'manage_options',
            'marine-world-locations',
            array($this, 'render_locations_page')
        );
        
        add_submenu_page(
            'marine-world-booking',
            'Promo Codes',
            'Promo Codes',
            'manage_options',
            'marine-world-promo-codes',
            array($this, 'render_promo_codes_page')
        );
        

        // Add Pricing Management submenu
        add_submenu_page(
            'marine-world-booking',
            'Pricing Management',
            'Pricing',
            'manage_options',
            'mwb-pricing',
             array($this, 'render_pricing_page')
);


        // REMOVED: Promo Codes submenu - causing critical error
    }
    
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'marine-world') === false) {
            return;
        }
        
        // Enqueue React and dependencies
        wp_enqueue_script('react', 'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js', array(), '18.2.0', true);
        wp_enqueue_script('react-dom', 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js', array('react'), '18.2.0', true);
        
        // Admin dashboard script
        wp_enqueue_script(
            'marine-world-admin-dashboard',
            MWB_PLUGIN_URL . 'assets/js/admin-dashboard.js',
            array('react', 'react-dom', 'jquery'),
            MWB_VERSION,
            true
        );
        
        // Admin styles
        wp_enqueue_style(
            'marine-world-admin-styles',
            MWB_PLUGIN_URL . 'assets/css/admin-styles.css',
            array(),
            MWB_VERSION
        );
        
        // WordPress admin styles
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');
        
        // Chart.js for analytics
        wp_enqueue_script('chart-js', 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js', array(), '3.9.1', true);
        
        // Localize script with admin data
        wp_localize_script('marine-world-admin-dashboard', 'marineWorldAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('mwb_admin_nonce'),
            'restUrl' => rest_url('marine-world/v1/'),
            'restNonce' => wp_create_nonce('wp_rest'),
            'currentPage' => $_GET['page'] ?? 'marine-world-booking',
            'locations' => $this->database->get_locations(),
            'currency' => '₹',
            'dateFormat' => 'Y-m-d',
            'timeFormat' => 'H:i:s'
        ));
    }
    
    public function register_settings() {
        // General Settings
        register_setting('mwb_general_settings', 'mwb_default_capacity');
        register_setting('mwb_general_settings', 'mwb_max_advance_booking_days');
        register_setting('mwb_general_settings', 'mwb_group_discount_15');
        register_setting('mwb_general_settings', 'mwb_group_discount_30');
        
        // Payment Settings
        register_setting('mwb_payment_settings', 'mwb_icici_merchant_id');
        register_setting('mwb_payment_settings', 'mwb_icici_access_code');
        register_setting('mwb_payment_settings', 'mwb_icici_working_key');
        register_setting('mwb_payment_settings', 'mwb_icici_test_mode');
        
        // Notification Settings
        register_setting('mwb_notification_settings', 'mwb_email_from_name');
        register_setting('mwb_notification_settings', 'mwb_email_from_address');
        register_setting('mwb_notification_settings', 'mwb_sms_provider');
        register_setting('mwb_notification_settings', 'mwb_textlocal_username');
        register_setting('mwb_notification_settings', 'mwb_textlocal_hash');
        register_setting('mwb_notification_settings', 'mwb_msg91_authkey');
        register_setting('mwb_notification_settings', 'mwb_whatsapp_enabled');
    }
    
    // Page Renderers
    public function render_dashboard_page() {
        ?>
        <div class="wrap">
            <h1>Marine World Booking Dashboard</h1>
            <div id="mwb-admin-dashboard"></div>
        </div>
        <?php
    }
    
    public function render_bookings_page() {
        ?>
        <div class="wrap">
            <h1>Bookings Management</h1>
            <div id="mwb-bookings-dashboard"></div>
        </div>
        <?php
    }
    
    public function render_availability_page() {
        ?>
        <div class="wrap">
            <h1>Availability Management</h1>
            <div id="mwb-availability-dashboard"></div>
        </div>
        <?php
    }
    
    public function render_analytics_page() {
        ?>
        <div class="wrap">
            <h1>Analytics & Reports</h1>
            <div id="mwb-analytics-dashboard"></div>
        </div>
        <?php
    }
    
    public function render_addons_page() {
        ?>
        <div class="wrap">
            <h1>Add-ons Management</h1>
            <div id="mwb-addons-dashboard"></div>
        </div>
        <?php
    }
    
    public function render_locations_page() {
        ?>
        <div class="wrap">
            <h1>Locations Management</h1>
            <div id="mwb-locations-dashboard"></div>
        </div>
        <?php
    }
    
    public function render_promo_codes_page() {
        ?>
        <div class="wrap">
            <h1>Promo Codes Management</h1>
            <div id="mwb-promo-codes-dashboard"></div>
        </div>
        <?php
    }
    
    public function render_birthday_offers_page() {
        ?>
        <div class="wrap">
            <h1>Birthday Offers Management</h1>
            <div id="mwb-birthday-offers-dashboard"></div>
        </div>
        <?php
    }
    
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>Marine World Booking Settings</h1>
            <div id="mwb-settings-dashboard"></div>
            
            <form method="post" action="options.php" id="mwb-settings-form" style="display: none;">
                <?php settings_fields('mwb_general_settings'); ?>
                
                <div id="general-tab" class="tab-content">
                    <h2>General Settings</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Default Capacity</th>
                            <td>
                                <input type="number" name="mwb_default_capacity" value="<?php echo esc_attr(get_option('mwb_default_capacity', 1000)); ?>" min="1" />
                                <p class="description">Default daily capacity for new locations</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Max Advance Booking Days</th>
                            <td>
                                <input type="number" name="mwb_max_advance_booking_days" value="<?php echo esc_attr(get_option('mwb_max_advance_booking_days', 60)); ?>" min="1" max="365" />
                                <p class="description">Maximum days in advance customers can book</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Group Discount (15+ people)</th>
                            <td>
                                <input type="number" name="mwb_group_discount_15" value="<?php echo esc_attr(get_option('mwb_group_discount_15', 5)); ?>" min="0" max="100" step="0.1" />%
                                <p class="description">Discount percentage for groups of 15 or more</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Group Discount (30+ people)</th>
                            <td>
                                <input type="number" name="mwb_group_discount_30" value="<?php echo esc_attr(get_option('mwb_group_discount_30', 10)); ?>" min="0" max="100" step="0.1" />%
                                <p class="description">Discount percentage for groups of 30 or more</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div id="payment-tab" class="tab-content" style="display: none;">
                    <h2>Payment Gateway Settings</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">ICICI Merchant ID</th>
                            <td>
                                <input type="text" name="mwb_icici_merchant_id" value="<?php echo esc_attr(get_option('mwb_icici_merchant_id')); ?>" class="regular-text" />
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">ICICI Access Code</th>
                            <td>
                                <input type="text" name="mwb_icici_access_code" value="<?php echo esc_attr(get_option('mwb_icici_access_code')); ?>" class="regular-text" />
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">ICICI Working Key</th>
                            <td>
                                <input type="password" name="mwb_icici_working_key" value="<?php echo esc_attr(get_option('mwb_icici_working_key')); ?>" class="regular-text" />
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Test Mode</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="mwb_icici_test_mode" value="yes" <?php checked(get_option('mwb_icici_test_mode'), 'yes'); ?> />
                                    Enable test mode
                                </label>
                                <p class="description">Use test environment for payments</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div id="notifications-tab" class="tab-content" style="display: none;">
                    <h2>Notification Settings</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Email From Name</th>
                            <td>
                                <input type="text" name="mwb_email_from_name" value="<?php echo esc_attr(get_option('mwb_email_from_name', 'Marine World')); ?>" class="regular-text" />
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Email From Address</th>
                            <td>
                                <input type="email" name="mwb_email_from_address" value="<?php echo esc_attr(get_option('mwb_email_from_address', 'noreply@marineworld.in')); ?>" class="regular-text" />
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">SMS Provider</th>
                            <td>
                                <select name="mwb_sms_provider">
                                    <option value="none" <?php selected(get_option('mwb_sms_provider'), 'none'); ?>>None</option>
                                    <option value="textlocal" <?php selected(get_option('mwb_sms_provider'), 'textlocal'); ?>>Textlocal</option>
                                    <option value="msg91" <?php selected(get_option('mwb_sms_provider'), 'msg91'); ?>>MSG91</option>
                                    <option value="twilio" <?php selected(get_option('mwb_sms_provider'), 'twilio'); ?>>Twilio</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">WhatsApp Notifications</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="mwb_whatsapp_enabled" value="yes" <?php checked(get_option('mwb_whatsapp_enabled'), 'yes'); ?> />
                                    Enable WhatsApp notifications
                                </label>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div id="advanced-tab" class="tab-content" style="display: none;">
                    <h2>Advanced Settings</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Debug Mode</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="mwb_debug_mode" value="yes" <?php checked(get_option('mwb_debug_mode'), 'yes'); ?> />
                                    Enable debug logging
                                </label>
                                <p class="description">Log detailed information for troubleshooting</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Cache Duration</th>
                            <td>
                                <input type="number" name="mwb_cache_duration" value="<?php echo esc_attr(get_option('mwb_cache_duration', 300)); ?>" min="60" max="3600" /> seconds
                                <p class="description">How long to cache availability data</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <?php submit_button(); ?>
            </form>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('.nav-tab').click(function(e) {
                e.preventDefault();
                var target = $(this).attr('href');
                
                $('.nav-tab').removeClass('nav-tab-active');
                $(this).addClass('nav-tab-active');
                
                $('.tab-content').hide();
                $(target + '-tab').show();
            });
        });
        </script>
        <?php
    }
    
    // AJAX Handlers
    public function get_dashboard_stats() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $date_from = sanitize_text_field($_POST['date_from'] ?? date('Y-m-01'));
        $date_to = sanitize_text_field($_POST['date_to'] ?? date('Y-m-d'));
        
        // Get basic stats
        $stats = $this->database->get_booking_stats(null, $date_from, $date_to);
        
        // Get recent bookings
        $recent_bookings = $this->database->get_bookings(5, 0);
        
        // Get today's stats
        $today_stats = $this->database->get_booking_stats(null, date('Y-m-d'), date('Y-m-d'));
        
        // Get payment analytics
        $payment_analytics = $this->payment_handler->get_payment_analytics($date_from, $date_to);
        
        // Get upcoming events (next 7 days with bookings)
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $upcoming_events = $wpdb->get_results(
            "SELECT booking_date, COUNT(*) as booking_count, SUM(general_tickets + child_tickets + senior_tickets) as total_visitors
             FROM {$bookings_table} 
             WHERE booking_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
             AND booking_status = 'confirmed'
             GROUP BY booking_date 
             ORDER BY booking_date"
        );
        
        wp_send_json_success(array(
            'stats' => $stats,
            'recent_bookings' => $recent_bookings,
            'today_stats' => $today_stats,
            'payment_analytics' => $payment_analytics,
            'upcoming_events' => $upcoming_events
        ));
    }
    
    public function get_bookings_list() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $page = intval($_POST['page'] ?? 1);
        $per_page = intval($_POST['per_page'] ?? 20);
        $search = sanitize_text_field($_POST['search'] ?? '');
        $filters = array(
            'date_from' => sanitize_text_field($_POST['date_from'] ?? ''),
            'date_to' => sanitize_text_field($_POST['date_to'] ?? ''),
            'location_id' => intval($_POST['location_id'] ?? 0),
            'status' => sanitize_text_field($_POST['status'] ?? '')
        );
        
        $offset = ($page - 1) * $per_page;
        
        if (!empty($search)) {
            $bookings = $this->booking_manager->search_bookings($search, $filters);
        } else {
            $bookings = $this->database->get_bookings($per_page, $offset, $filters);
        }
        
        // Get total count for pagination
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        $total_count = $wpdb->get_var("SELECT COUNT(*) FROM {$bookings_table}");
        
        wp_send_json_success(array(
            'bookings' => $bookings,
            'total_count' => $total_count,
            'total_pages' => ceil($total_count / $per_page),
            'current_page' => $page
        ));
    }
    
    public function get_availability_data() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $location_id = intval($_POST['location_id'] ?? 1);
        $date_from = sanitize_text_field($_POST['date_from'] ?? date('Y-m-01'));
        $date_to = sanitize_text_field($_POST['date_to'] ?? date('Y-m-t'));
        
        $availability = $this->database->get_availability($location_id, $date_from, $date_to);
        
        wp_send_json_success($availability);
    }
    
    public function update_availability() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $location_id = intval($_POST['location_id']);
        $date = sanitize_text_field($_POST['date']);
        $capacity = intval($_POST['capacity']);
        $is_blackout = isset($_POST['is_blackout']) ? 1 : 0;
        $special_pricing = floatval($_POST['special_pricing'] ?? 0);
        
        $result = $this->booking_manager->update_location_capacity($location_id, $date, $capacity);
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        }
        
        // Update additional settings
        global $wpdb;
        $availability_table = $wpdb->prefix . 'mwb_availability';
        
        $update_data = array();
        if ($is_blackout) {
            $update_data['is_blackout'] = 1;
            $update_data['status'] = 'blackout';
        }
        if ($special_pricing > 0) {
            $update_data['special_pricing'] = $special_pricing;
        }
        
        if (!empty($update_data)) {
            $wpdb->update(
                $availability_table,
                $update_data,
                array('location_id' => $location_id, 'availability_date' => $date)
            );
        }
        
        wp_send_json_success('Availability updated successfully');
    }
    
    public function export_bookings() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $format = sanitize_text_field($_POST['format'] ?? 'csv');
        $filters = array(
            'date_from' => sanitize_text_field($_POST['date_from'] ?? ''),
            'date_to' => sanitize_text_field($_POST['date_to'] ?? ''),
            'location_id' => intval($_POST['location_id'] ?? 0),
            'status' => sanitize_text_field($_POST['status'] ?? '')
        );
        
        $report = $this->booking_manager->generate_booking_report($format, $filters);
        
        wp_send_json_success($report);
    }
    
    public function bulk_action_bookings() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $booking_ids = array_map('sanitize_text_field', $_POST['booking_ids'] ?? array());
        $action = sanitize_text_field($_POST['action']);
        $data = array(
            'reason' => sanitize_textarea_field($_POST['reason'] ?? '')
        );
        
        if (empty($booking_ids) || empty($action)) {
            wp_send_json_error('Missing required parameters');
        }
        
        $result = $this->booking_manager->bulk_update_bookings($booking_ids, $action, $data);
        
        wp_send_json_success($result);
    }
    
    public function get_settings() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $settings = array(
            // General settings
            'default_capacity' => get_option('mwb_default_capacity', 1000),
            'booking_window_days' => get_option('mwb_booking_window_days', 365),
            'booking_timeout_minutes' => get_option('mwb_booking_timeout_minutes', 30),
            'min_tickets_per_booking' => get_option('mwb_min_tickets_per_booking', 1),
            'max_tickets_per_booking' => get_option('mwb_max_tickets_per_booking', 50),
            
            // Payment settings
            'icici_test_mode' => get_option('mwb_icici_test_mode', 'yes'),
            'icici_merchant_id' => get_option('mwb_icici_merchant_id', ''),
            'icici_working_key' => get_option('mwb_icici_working_key', ''),
            'icici_access_code' => get_option('mwb_icici_access_code', ''),
            
            // Notification settings
            'admin_email' => get_option('mwb_admin_email', get_option('admin_email')),
            'send_booking_confirmation' => get_option('mwb_send_booking_confirmation', 'yes'),
            'send_admin_notification' => get_option('mwb_send_admin_notification', 'yes'),
            'send_reminder_emails' => get_option('mwb_send_reminder_emails', 'no'),
            'email_from_name' => get_option('mwb_email_from_name', 'Marine World'),
            
            // Advanced settings
            'debug_mode' => get_option('mwb_debug_mode', 'no'),
            'cache_duration_hours' => get_option('mwb_cache_duration_hours', 24),
            'auto_cleanup_expired' => get_option('mwb_auto_cleanup_expired', 'yes'),
            'generate_qr_codes' => get_option('mwb_generate_qr_codes', 'yes')
        );
        
        wp_send_json_success(array('settings' => $settings));
    }
    
    public function save_settings() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $settings = isset($_POST['settings']) ? $_POST['settings'] : array();
        
        foreach ($settings as $key => $value) {
            $sanitized_key = 'mwb_' . sanitize_key($key);
            
            if (is_array($value)) {
                $sanitized_value = array_map('sanitize_text_field', $value);
            } else {
                $sanitized_value = sanitize_text_field($value);
            }
            
            update_option($sanitized_key, $sanitized_value);
        }
        
        wp_send_json_success(array('message' => 'Settings saved successfully'));
    }
    
    public function clear_all_bookings() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        // Double check with confirmation
        $confirm = sanitize_text_field($_POST['confirm'] ?? '');
        if ($confirm !== 'DELETE_ALL_BOOKINGS') {
            wp_send_json_error('Confirmation required. Please type DELETE_ALL_BOOKINGS to confirm.');
        }
        
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        try {
            // Clear all bookings
            $result = $wpdb->query("TRUNCATE TABLE {$bookings_table}");
            
            if ($result === false) {
                wp_send_json_error('Failed to clear bookings: ' . $wpdb->last_error);
            }
            
            wp_send_json_success(array(
                'message' => 'All bookings have been cleared successfully'
            ));
            
        } catch (Exception $e) {
            wp_send_json_error('Error clearing bookings: ' . $e->getMessage());
        }
    }
    
    // Helper methods
    public function get_booking_status_options() {
        return array(
            'pending' => 'Pending',
            'confirmed' => 'Confirmed',
            'cancelled' => 'Cancelled',
            'refunded' => 'Refunded',
            'expired' => 'Expired'
        );
    }
    
    public function get_payment_status_options() {
        return array(
            'pending' => 'Pending',
            'completed' => 'Completed',
            'failed' => 'Failed',
            'refunded' => 'Refunded'
        );
    }
    
    // Location Management AJAX Handlers
    public function get_locations_list() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $search = sanitize_text_field($_POST['search'] ?? '');
        $status_filter = sanitize_text_field($_POST['status'] ?? '');
        
        global $wpdb;
        $locations_table = $wpdb->prefix . 'mwb_locations';
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $where_clauses = array();
        $params = array();
        
        if (!empty($search)) {
            $where_clauses[] = "(l.name LIKE %s OR l.city LIKE %s OR l.state LIKE %s)";
            $search_wildcard = '%' . $wpdb->esc_like($search) . '%';
            $params = array_merge($params, array($search_wildcard, $search_wildcard, $search_wildcard));
        }
        
        if (!empty($status_filter)) {
            $where_clauses[] = "l.status = %s";
            $params[] = $status_filter;
        }
        
        $where_sql = empty($where_clauses) ? '1=1' : implode(' AND ', $where_clauses);
        
        $locations = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT l.*, 
                        COUNT(b.id) as total_bookings,
                        SUM(CASE WHEN b.booking_status = 'confirmed' THEN b.total_amount ELSE 0 END) as total_revenue,
                        SUM(CASE WHEN b.booking_date >= CURDATE() - INTERVAL 30 DAY AND b.booking_status = 'confirmed' THEN 1 ELSE 0 END) as recent_bookings
                 FROM {$locations_table} l
                 LEFT JOIN {$bookings_table} b ON l.id = b.location_id
                 WHERE {$where_sql}
                 GROUP BY l.id
                 ORDER BY l.name",
                ...$params
            )
        );
        
        // Format the data
        $formatted_locations = array_map(function($location) {
            return array(
                'id' => (int) $location->id,
                'name' => $location->name,
                'address' => $location->address,
                'city' => $location->city,
                'state' => $location->state,
                'pincode' => $location->pincode,
                'phone' => $location->phone,
                'email' => $location->email,
                'timings' => json_decode($location->timings, true) ?: array(),
                'facilities' => json_decode($location->facilities, true) ?: array(),
                'status' => $location->status,
                'total_bookings' => (int) $location->total_bookings,
                'total_revenue' => (float) $location->total_revenue,
                'recent_bookings' => (int) $location->recent_bookings,
                'created_at' => $location->created_at,
                'updated_at' => $location->updated_at
            );
        }, $locations);
        
        wp_send_json_success($formatted_locations);
    }
    
    public function get_location() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $location_id = intval($_POST['location_id']);
        
        if (!$location_id) {
            wp_send_json_error('Invalid location ID');
        }
        
        $location = $this->database->get_location($location_id);
        
        if (!$location) {
            wp_send_json_error('Location not found');
        }
        
        $formatted_location = array(
            'id' => (int) $location->id,
            'name' => $location->name,
            'address' => $location->address,
            'city' => $location->city,
            'state' => $location->state,
            'pincode' => $location->pincode,
            'phone' => $location->phone,
            'email' => $location->email,
            'timings' => json_decode($location->timings, true) ?: array(),
            'facilities' => json_decode($location->facilities, true) ?: array(),
            'status' => $location->status
        );
        
        wp_send_json_success($formatted_location);
    }
    
    public function save_location() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $location_id = intval($_POST['location_id'] ?? 0);
        $location_data = array(
            'name' => sanitize_text_field($_POST['name']),
            'address' => sanitize_textarea_field($_POST['address']),
            'city' => sanitize_text_field($_POST['city']),
            'state' => sanitize_text_field($_POST['state']),
            'pincode' => sanitize_text_field($_POST['pincode']),
            'phone' => sanitize_text_field($_POST['phone']),
            'email' => sanitize_email($_POST['email']),
            'timings' => json_encode($_POST['timings'] ?? array()),
            'facilities' => json_encode(array_map('sanitize_text_field', $_POST['facilities'] ?? array())),
            'status' => sanitize_text_field(isset($_POST['status']) ? $_POST['status'] : 'active')
        );
        
        // Validation
        if (empty($location_data['name'])) {
            wp_send_json_error('Location name is required');
        }
        
        if (!empty($location_data['email']) && !is_email($location_data['email'])) {
            wp_send_json_error('Invalid email address');
        }
        
        global $wpdb;
        $locations_table = $wpdb->prefix . 'mwb_locations';
        
        if ($location_id) {
            // Update existing location
            $result = $wpdb->update(
                $locations_table,
                $location_data,
                array('id' => $location_id)
            );
            
            if ($result === false) {
                wp_send_json_error('Failed to update location');
            }
            
            wp_send_json_success(array(
                'message' => 'Location updated successfully',
                'location_id' => $location_id
            ));
        } else {
            // Create new location
            $result = $wpdb->insert($locations_table, $location_data);
            
            if ($result === false) {
                wp_send_json_error('Failed to create location');
            }
            
            $new_location_id = $wpdb->insert_id;
            
            // Create initial availability data for the new location
            $this->create_initial_availability($new_location_id);
            
            wp_send_json_success(array(
                'message' => 'Location created successfully',
                'location_id' => $new_location_id
            ));
        }
    }
    
    public function delete_location() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $location_id = intval($_POST['location_id']);
        
        if (!$location_id) {
            wp_send_json_error('Invalid location ID');
        }
        
        // Check if location has bookings
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        $booking_count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$bookings_table} WHERE location_id = %d",
                $location_id
            )
        );
        
        if ($booking_count > 0) {
            wp_send_json_error('Cannot delete location with existing bookings. Please deactivate instead.');
        }
        
        // Delete location and related data
        $locations_table = $wpdb->prefix . 'mwb_locations';
        $availability_table = $wpdb->prefix . 'mwb_availability';
        
        // Delete availability data
        $wpdb->delete($availability_table, array('location_id' => $location_id));
        
        // Delete location
        $result = $wpdb->delete($locations_table, array('id' => $location_id));
        
        if ($result === false) {
            wp_send_json_error('Failed to delete location');
        }
        
        wp_send_json_success('Location deleted successfully');
    }
    
    public function bulk_action_locations() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $location_ids = array_map('intval', $_POST['location_ids'] ?? array());
        $action = sanitize_text_field($_POST['action']);
        
        if (empty($location_ids) || empty($action)) {
            wp_send_json_error('Missing required parameters');
        }
        
        global $wpdb;
        $locations_table = $wpdb->prefix . 'mwb_locations';
        
        $results = array(
            'success' => 0,
            'failed' => 0,
            'errors' => array()
        );
        
        foreach ($location_ids as $location_id) {
            switch ($action) {
                case 'activate':
                    $result = $wpdb->update(
                        $locations_table,
                        array('status' => 'active'),
                        array('id' => $location_id)
                    );
                    break;
                    
                case 'deactivate':
                    $result = $wpdb->update(
                        $locations_table,
                        array('status' => 'inactive'),
                        array('id' => $location_id)
                    );
                    break;
                    
                case 'delete':
                    // Check for bookings first
                    $bookings_table = $wpdb->prefix . 'mwb_bookings';
                    $booking_count = $wpdb->get_var(
                        $wpdb->prepare(
                            "SELECT COUNT(*) FROM {$bookings_table} WHERE location_id = %d",
                            $location_id
                        )
                    );
                    
                    if ($booking_count > 0) {
                        $results['failed']++;
                        $results['errors'][] = "Location ID {$location_id} has existing bookings";
                        continue 2;
                    }
                    
                    // Delete availability data
                    $availability_table = $wpdb->prefix . 'mwb_availability';
                    $wpdb->delete($availability_table, array('location_id' => $location_id));
                    
                    // Delete location
                    $result = $wpdb->delete($locations_table, array('id' => $location_id));
                    break;
                    
                default:
                    $results['failed']++;
                    $results['errors'][] = "Unknown action: {$action}";
                    continue 2;
            }
            
            if ($result !== false) {
                $results['success']++;
            } else {
                $results['failed']++;
                $results['errors'][] = "Failed to {$action} location ID {$location_id}";
            }
        }
        
        wp_send_json_success($results);
    }
    
    public function get_location_stats() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $location_id = intval($_POST['location_id']);
        $date_from = sanitize_text_field($_POST['date_from'] ?? date('Y-m-01'));
        $date_to = sanitize_text_field($_POST['date_to'] ?? date('Y-m-d'));
        
        if (!$location_id) {
            wp_send_json_error('Invalid location ID');
        }
        
        // Get booking stats for this location
        $stats = $this->database->get_booking_stats($location_id, $date_from, $date_to);
        
        // Get daily breakdown
        $daily_stats = $this->database->get_daily_booking_stats($date_from, $date_to, $location_id);
        
        // Get availability utilization
        global $wpdb;
        $availability_table = $wpdb->prefix . 'mwb_availability';
        
        $utilization = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT 
                    availability_date,
                    total_capacity,
                    booked_slots,
                    available_slots,
                    ROUND((booked_slots / total_capacity) * 100, 2) as utilization_percentage
                 FROM {$availability_table}
                 WHERE location_id = %d 
                 AND availability_date BETWEEN %s AND %s
                 ORDER BY availability_date",
                $location_id,
                $date_from,
                $date_to
            )
        );
        
        wp_send_json_success(array(
            'stats' => $stats,
            'daily_breakdown' => $daily_stats,
            'utilization' => $utilization
        ));
    }
    
    // Add-ons Management AJAX Handlers
    public function get_addons_list() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $search = sanitize_text_field($_POST['search'] ?? '');
        $status_filter = sanitize_text_field($_POST['status'] ?? '');
        
        if (!empty($search)) {
            $addons = $this->database->search_addons($search, $status_filter);
        } else {
            $addons = $this->database->get_addons(true); // Include inactive
            
            if (!empty($status_filter)) {
                $addons = array_filter($addons, function($addon) use ($status_filter) {
                    return $addon->status === $status_filter;
                });
            }
        }
        
        // Get usage stats for each addon
        $addon_stats = $this->database->get_addon_usage_stats();
        
        // Format the data
        $formatted_addons = array_map(function($addon) use ($addon_stats) {
            $stats = $addon_stats[$addon->id] ?? array('total_bookings' => 0, 'total_quantity' => 0);
            
            return array(
                'id' => (int) $addon->id,
                'name' => $addon->name,
                'description' => $addon->description,
                'price' => (float) $addon->price,
                'image_url' => $addon->image_url,
                'status' => $addon->status,
                'display_order' => (int) $addon->display_order,
                'total_bookings' => (int) $stats['total_bookings'],
                'total_quantity' => (int) $stats['total_quantity'],
                'created_at' => $addon->created_at,
                'updated_at' => $addon->updated_at
            );
        }, $addons);
        
        // Sort by display order
        usort($formatted_addons, function($a, $b) {
            return $a['display_order'] - $b['display_order'];
        });
        
        wp_send_json_success($formatted_addons);
    }
    
    public function get_addon() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $addon_id = intval($_POST['addon_id']);
        
        if (!$addon_id) {
            wp_send_json_error('Invalid add-on ID');
        }
        
        $addon = $this->database->get_addon($addon_id);
        
        if (!$addon) {
            wp_send_json_error('Add-on not found');
        }
        
        $formatted_addon = array(
            'id' => (int) $addon->id,
            'name' => $addon->name,
            'description' => $addon->description,
            'price' => (float) $addon->price,
            'image_url' => $addon->image_url,
            'status' => $addon->status,
            'display_order' => (int) $addon->display_order
        );
        
        wp_send_json_success($formatted_addon);
    }
    
    public function save_addon() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $addon_id = intval($_POST['addon_id'] ?? 0);
        $addon_data = array(
            'name' => sanitize_text_field($_POST['name']),
            'description' => sanitize_textarea_field($_POST['description']),
            'price' => floatval($_POST['price']),
            'status' => sanitize_text_field(isset($_POST['status']) ? $_POST['status'] : 'active'),
            'display_order' => intval($_POST['display_order'] ?? 0)
        );
        
        // Handle image upload
        if (!empty($_FILES['addon_image']) && $_FILES['addon_image']['error'] === UPLOAD_ERR_OK) {
            error_log('MWB: Processing image upload for addon'); // Debug log
            $uploaded_image = $this->handle_image_upload($_FILES['addon_image']);
            if (is_wp_error($uploaded_image)) {
                error_log('MWB: Image upload error: ' . $uploaded_image->get_error_message()); // Debug log
                wp_send_json_error($uploaded_image->get_error_message());
            }
            $addon_data['image_url'] = $uploaded_image;
            error_log('MWB: Image uploaded successfully: ' . $uploaded_image); // Debug log
        } elseif (isset($_POST['image_url'])) {
            // Keep existing image URL if provided
            $addon_data['image_url'] = sanitize_url($_POST['image_url']);
            error_log('MWB: Keeping existing image: ' . $addon_data['image_url']); // Debug log
        }
        
        // Validation
        if (empty($addon_data['name'])) {
            wp_send_json_error('Add-on name is required');
        }
        
        if ($addon_data['price'] < 0) {
            wp_send_json_error('Price cannot be negative');
        }
        
        if ($addon_id) {
            // Update existing add-on
            $result = $this->database->update_addon($addon_id, $addon_data);
            
            if ($result === false) {
                wp_send_json_error('Failed to update add-on');
            }
            
            wp_send_json_success(array(
                'message' => 'Add-on updated successfully',
                'addon_id' => $addon_id
            ));
        } else {
            // Create new add-on
            $result = $this->database->create_addon($addon_data);
            
            if ($result === false) {
                wp_send_json_error('Failed to create add-on');
            }
            
            wp_send_json_success(array(
                'message' => 'Add-on created successfully',
                'addon_id' => $result
            ));
        }
    }
    
    private function handle_image_upload($file) {
        // Check if file is valid
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return new WP_Error('invalid_file', 'Invalid file upload');
        }
        
        // Check file size (max 2MB)
        if ($file['size'] > 2 * 1024 * 1024) {
            return new WP_Error('file_too_large', 'File size must be less than 2MB');
        }
        
        // Check file type
        $allowed_types = array('image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp');
        $file_type = wp_check_filetype($file['name'], null);
        
        if (!in_array($file['type'], $allowed_types)) {
            return new WP_Error('invalid_file_type', 'Only JPEG, PNG, GIF, and WebP images are allowed');
        }
        
        // Set up the array of supported file types for WordPress
        $wp_filetype = wp_check_filetype_and_ext($file['tmp_name'], $file['name']);
        if (!$wp_filetype['type']) {
            return new WP_Error('invalid_file_type', 'Invalid file type');
        }
        
        // Include the WordPress file handling functions
        if (!function_exists('wp_handle_upload')) {
            require_once(ABSPATH . 'wp-admin/includes/file.php');
        }
        
        // Set up upload overrides
        $upload_overrides = array(
            'test_form' => false,
            'unique_filename_callback' => function($dir, $name, $ext) {
                // Add timestamp to filename to make it unique
                $timestamp = current_time('timestamp');
                $name_parts = pathinfo($name);
                return $name_parts['filename'] . '_' . $timestamp . '.' . $name_parts['extension'];
            }
        );
        
        // Handle the upload
        $uploaded_file = wp_handle_upload($file, $upload_overrides);
        
        if (isset($uploaded_file['error'])) {
            return new WP_Error('upload_error', $uploaded_file['error']);
        }
        
        // Return the URL of the uploaded file
        return $uploaded_file['url'];
    }
    
    public function delete_addon() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $addon_id = intval($_POST['addon_id']);
        
        if (!$addon_id) {
            wp_send_json_error('Invalid add-on ID');
        }
        
        $result = $this->database->delete_addon($addon_id);
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        }
        
        if ($result === false) {
            wp_send_json_error('Failed to delete add-on');
        }
        
        wp_send_json_success('Add-on deleted successfully');
    }
    
    public function bulk_action_addons() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $addon_ids = array_map('intval', $_POST['addon_ids'] ?? array());
        $action = sanitize_text_field($_POST['action']);
        
        if (empty($addon_ids) || empty($action)) {
            wp_send_json_error('Missing required parameters');
        }
        
        $results = array(
            'success' => 0,
            'failed' => 0,
            'errors' => array()
        );
        
        foreach ($addon_ids as $addon_id) {
            switch ($action) {
                case 'activate':
                    $result = $this->database->update_addon($addon_id, array('status' => 'active'));
                    break;
                    
                case 'deactivate':
                    $result = $this->database->update_addon($addon_id, array('status' => 'inactive'));
                    break;
                    
                case 'delete':
                    $result = $this->database->delete_addon($addon_id);
                    if (is_wp_error($result)) {
                        $results['failed']++;
                        $results['errors'][] = "Add-on ID {$addon_id}: " . $result->get_error_message();
                        continue 2;
                    }
                    break;
                    
                default:
                    $results['failed']++;
                    $results['errors'][] = "Unknown action: {$action}";
                    continue 2;
            }
            
            if ($result !== false) {
                $results['success']++;
            } else {
                $results['failed']++;
                $results['errors'][] = "Failed to {$action} add-on ID {$addon_id}";
            }
        }
        
        wp_send_json_success($results);
    }
    
    public function update_addon_order() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $addon_orders = $_POST['addon_orders'] ?? array();
        
        if (empty($addon_orders)) {
            wp_send_json_error('No order data provided');
        }
        
        $result = $this->database->update_addon_order($addon_orders);
        
        if ($result) {
            wp_send_json_success('Add-on order updated successfully');
        } else {
            wp_send_json_error('Failed to update add-on order');
        }
    }
    
    public function get_addon_stats() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $addon_id = intval($_POST['addon_id'] ?? 0);
        $date_from = sanitize_text_field($_POST['date_from'] ?? date('Y-m-01'));
        $date_to = sanitize_text_field($_POST['date_to'] ?? date('Y-m-d'));
        
        if ($addon_id) {
            // Get stats for specific add-on
            $stats = $this->database->get_addon_usage_stats($addon_id, $date_from, $date_to);
            $addon = $this->database->get_addon($addon_id);
            
            if (!$addon) {
                wp_send_json_error('Add-on not found');
            }
            
            wp_send_json_success(array(
                'addon' => array(
                    'id' => (int) $addon->id,
                    'name' => $addon->name,
                    'price' => (float) $addon->price
                ),
                'stats' => $stats,
                'revenue' => $stats['total_quantity'] * $addon->price
            ));
        } else {
            // Get stats for all add-ons
            $all_stats = $this->database->get_addon_usage_stats(null, $date_from, $date_to);
            $addons = $this->database->get_addons(true);
            
            $formatted_stats = array();
            $total_revenue = 0;
            $total_bookings = 0;
            $total_quantity = 0;
            
            foreach ($addons as $addon) {
                $stats = $all_stats[$addon->id] ?? array('total_bookings' => 0, 'total_quantity' => 0);
                $revenue = $stats['total_quantity'] * $addon->price;
                
                $formatted_stats[] = array(
                    'addon' => array(
                        'id' => (int) $addon->id,
                        'name' => $addon->name,
                        'price' => (float) $addon->price
                    ),
                    'stats' => $stats,
                    'revenue' => $revenue
                );
                
                $total_revenue += $revenue;
                $total_bookings += $stats['total_bookings'];
                $total_quantity += $stats['total_quantity'];
            }
            
            wp_send_json_success(array(
                'addons' => $formatted_stats,
                'totals' => array(
                    'revenue' => $total_revenue,
                    'bookings' => $total_bookings,
                    'quantity' => $total_quantity
                )
            ));
        }
    }
    
    // Helper method to create initial availability for new locations
    private function create_initial_availability($location_id) {
        global $wpdb;
        $availability_table = $wpdb->prefix . 'mwb_availability';
        $default_capacity = get_option('mwb_default_capacity', 1000);
        
        // Create availability for next 60 days
        for ($i = 0; $i < 60; $i++) {
            $date = date('Y-m-d', strtotime("+$i days"));
            
            $wpdb->insert(
                $availability_table,
                array(
                    'location_id' => $location_id,
                    'availability_date' => $date,
                    'total_capacity' => $default_capacity,
                    'booked_slots' => 0,
                    'available_slots' => $default_capacity,
                    'status' => 'available',
                    'is_blackout' => 0
                )
            );
        }
    }


    public function render_pricing_page() {
    ?>
    <div class="wrap">
        <h1>Ticket Pricing Management</h1>
        <div id="mwb-pricing-dashboard"></div>
    </div>
    <?php
}

// Get current ticket prices
public function get_ticket_prices() {
    if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
    
    if (!$this->check_user_capability('edit_posts')) {
        wp_die('Unauthorized');
    }
    
    // Get current prices from database
    $default_prices = array(
        'general' => 400,
        'child' => 280,
        'senior' => 350
    );
    
    $current_prices = get_option('mwb_ticket_prices', $default_prices);
    $birthday_discount_rate = get_option('mwb_birthday_discount_rate', 10);
    $seasonal_pricing = get_option('mwb_seasonal_pricing', array());
    $dynamic_pricing_enabled = get_option('mwb_dynamic_pricing_enabled', false);
    
    wp_send_json_success(array(
        'prices' => $current_prices,
        'birthday_discount_rate' => $birthday_discount_rate,
        'seasonal_pricing' => $seasonal_pricing,
        'dynamic_pricing_enabled' => $dynamic_pricing_enabled,
        'currency' => get_option('mwb_currency', '₹')
    ));
}

// Update ticket prices
public function update_ticket_prices() {
    if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
    
    if (!$this->check_user_capability('edit_posts')) {
        wp_die('Unauthorized');
    }
    
    $prices = $_POST['prices'] ?? array();
    $birthday_discount_rate = isset($_POST['birthday_discount_rate']) ? floatval($_POST['birthday_discount_rate']) : 10;
    $seasonal_pricing = $_POST['seasonal_pricing'] ?? array();
    $dynamic_pricing_enabled = isset($_POST['dynamic_pricing_enabled']) ? (bool)$_POST['dynamic_pricing_enabled'] : false;
    
    // Validate and sanitize prices
    $validated_prices = array();
    $allowed_types = array('general', 'child', 'senior');
    
    foreach ($allowed_types as $type) {
        if (isset($prices[$type])) {
            $price = floatval($prices[$type]);
            if ($price >= 0) {
                $validated_prices[$type] = $price;
            }
        }
    }
    
    // Validate seasonal pricing
    $validated_seasonal = array();
    if (is_array($seasonal_pricing)) {
        foreach ($seasonal_pricing as $season) {
            if (isset($season['name'], $season['start_date'], $season['end_date'], $season['multiplier'])) {
                $validated_seasonal[] = array(
                    'name' => sanitize_text_field($season['name']),
                    'start_date' => sanitize_text_field($season['start_date']),
                    'end_date' => sanitize_text_field($season['end_date']),
                    'multiplier' => floatval($season['multiplier']),
                    'active' => isset($season['active']) ? (bool)$season['active'] : true
                );
            }
        }
    }
    
    // Validate birthday discount rate
    if ($birthday_discount_rate < 0) $birthday_discount_rate = 0;
    if ($birthday_discount_rate > 100) $birthday_discount_rate = 100;
    
    // Update options
    update_option('mwb_ticket_prices', $validated_prices);
    update_option('mwb_birthday_discount_rate', $birthday_discount_rate);
    update_option('mwb_seasonal_pricing', $validated_seasonal);
    update_option('mwb_dynamic_pricing_enabled', $dynamic_pricing_enabled);
    
    // Clear any pricing cache
    wp_cache_delete('mwb_current_ticket_prices');
    
    wp_send_json_success(array(
        'message' => 'Pricing updated successfully',
        'prices' => $validated_prices
    ));
}

// Reset to default prices
public function reset_ticket_prices() {
    if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
    
    if (!$this->check_user_capability('edit_posts')) {
        wp_die('Unauthorized');
    }
    
    $default_prices = array(
        'general' => 400,
        'child' => 280,
        'senior' => 350
    );
    
    update_option('mwb_ticket_prices', $default_prices);
    delete_option('mwb_seasonal_pricing');
    update_option('mwb_dynamic_pricing_enabled', false);
    
    // Clear cache
    wp_cache_delete('mwb_current_ticket_prices');
    
    wp_send_json_success(array(
        'message' => 'Pricing reset to defaults',
        'prices' => $default_prices
    ));
}

    // Promo codes AJAX handlers
    public function get_promo_codes_list() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        $page = isset($_POST['page']) ? intval($_POST['page']) : 1;
        $per_page = isset($_POST['per_page']) ? intval($_POST['per_page']) : 20;
        $search = isset($_POST['search']) ? sanitize_text_field($_POST['search']) : '';
        $status_filter = isset($_POST['status']) ? sanitize_text_field($_POST['status']) : '';
        
        try {
            if (!empty($search)) {
                $promo_codes = $this->database->search_promo_codes($search, $status_filter);
            } else {
                $promo_codes = $this->database->get_promo_codes($status_filter === 'all');
            }
            
            $total_items = count($promo_codes);
            $offset = ($page - 1) * $per_page;
            $paged_items = array_slice($promo_codes, $offset, $per_page);
            
            wp_send_json_success(array(
                'promo_codes' => $paged_items,
                'total_items' => $total_items,
                'total_pages' => ceil($total_items / $per_page),
                'current_page' => $page
            ));
        } catch (Exception $e) {
            wp_send_json_error('Failed to fetch promo codes: ' . $e->getMessage());
        }
    }
    
    public function get_promo_code() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        $promo_id = isset($_POST['promo_id']) ? intval($_POST['promo_id']) : 0;
        
        if (!$promo_id) {
            wp_send_json_error('Invalid promo code ID');
        }
        
        try {
            $promo_code = $this->database->get_promo_code_by_id($promo_id);
            
            if (!$promo_code) {
                wp_send_json_error('Promo code not found');
            }
            
            wp_send_json_success(array('promo_code' => $promo_code));
        } catch (Exception $e) {
            wp_send_json_error('Failed to fetch promo code: ' . $e->getMessage());
        }
    }
    
    public function save_promo_code() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        $promo_id = isset($_POST['promo_id']) ? intval($_POST['promo_id']) : 0;
        $promo_data = array(
            'code' => isset($_POST['code']) ? sanitize_text_field($_POST['code']) : '',
            'description' => isset($_POST['description']) ? sanitize_textarea_field($_POST['description']) : '',
            'discount_type' => isset($_POST['discount_type']) ? sanitize_text_field($_POST['discount_type']) : 'percentage',
            'discount_value' => isset($_POST['discount_value']) ? floatval($_POST['discount_value']) : 0,
            'min_amount' => isset($_POST['min_amount']) ? floatval($_POST['min_amount']) : 0,
            'max_discount' => isset($_POST['max_discount']) ? floatval($_POST['max_discount']) : 0,
            'usage_limit' => isset($_POST['usage_limit']) ? intval($_POST['usage_limit']) : 0,
            'valid_from' => isset($_POST['valid_from']) ? sanitize_text_field($_POST['valid_from']) : '',
            'valid_until' => isset($_POST['valid_until']) ? sanitize_text_field($_POST['valid_until']) : '',
            'status' => isset($_POST['status']) ? sanitize_text_field($_POST['status']) : 'active'
        );
        
        // Validate required fields
        if (empty($promo_data['code'])) {
            wp_send_json_error('Promo code is required');
        }
        
        try {
            if ($promo_id) {
                $result = $this->database->update_promo_code($promo_id, $promo_data);
                $message = 'Promo code updated successfully';
            } else {
                $result = $this->database->create_promo_code($promo_data);
                $message = 'Promo code created successfully';
                $promo_id = $result;
            }
            
            if ($result === false) {
                wp_send_json_error('Failed to save promo code');
            }
            
            wp_send_json_success(array(
                'message' => $message,
                'promo_id' => $promo_id
            ));
        } catch (Exception $e) {
            wp_send_json_error('Failed to save promo code: ' . $e->getMessage());
        }
    }
    
    public function delete_promo_code() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        $promo_id = isset($_POST['promo_id']) ? intval($_POST['promo_id']) : 0;
        
        if (!$promo_id) {
            wp_send_json_error('Invalid promo code ID');
        }
        
        try {
            $result = $this->database->delete_promo_code($promo_id);
            
            if ($result === false) {
                wp_send_json_error('Failed to delete promo code');
            }
            
            wp_send_json_success(array('message' => 'Promo code deleted successfully'));
        } catch (Exception $e) {
            wp_send_json_error('Failed to delete promo code: ' . $e->getMessage());
        }
    }
    
    public function bulk_action_promo_codes() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        $action = isset($_POST['action']) ? sanitize_text_field($_POST['action']) : '';
        $promo_ids = isset($_POST['promo_ids']) ? array_map('intval', $_POST['promo_ids']) : array();
        
        if (empty($action) || empty($promo_ids)) {
            wp_send_json_error('Invalid action or no promo codes selected');
        }
        
        try {
            $processed = 0;
            
            foreach ($promo_ids as $promo_id) {
                switch ($action) {
                    case 'delete':
                        if ($this->database->delete_promo_code($promo_id)) {
                            $processed++;
                        }
                        break;
                    case 'activate':
                        if ($this->database->update_promo_code($promo_id, array('status' => 'active'))) {
                            $processed++;
                        }
                        break;
                    case 'deactivate':
                        if ($this->database->update_promo_code($promo_id, array('status' => 'inactive'))) {
                            $processed++;
                        }
                        break;
                }
            }
            
            wp_send_json_success(array(
                'message' => sprintf('%d promo codes processed', $processed),
                'processed' => $processed
            ));
        } catch (Exception $e) {
            wp_send_json_error('Failed to process promo codes: ' . $e->getMessage());
        }
    }

    /**
     * Birthday Offers Management AJAX Handlers
     */
    public function get_birthday_offers() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        try {
            // Force database upgrade to ensure new columns exist
            $this->database->upgrade_tables();
            
            // Check if table exists and log structure for debugging
            global $wpdb;
            $table_name = $wpdb->prefix . 'mwb_birthday_offers';
            
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'");
            if (!$table_exists) {
                error_log('Birthday offers table does not exist, creating...');
                $this->database->create_tables();
            }
            
            $columns = $wpdb->get_col("DESCRIBE $table_name", 0);
            error_log('Birthday offers table columns: ' . print_r($columns, true));
            
            $search = sanitize_text_field($_POST['search'] ?? '');
            $status = sanitize_text_field($_POST['status'] ?? '');
            
            // Pass null instead of empty status to get all records
            $status_filter = !empty($status) ? $status : null;
            
            $offers = $this->database->get_birthday_offers($status_filter);
            wp_send_json_success($offers);
        } catch (Exception $e) {
            error_log('Get birthday offers error: ' . $e->getMessage());
            wp_send_json_error('Failed to load birthday offers: ' . $e->getMessage());
        }
    }
    
    public function get_birthday_offer() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $id = intval($_POST['id'] ?? 0);
        
        if (!$id) {
            wp_send_json_error('Invalid offer ID');
        }
        
        try {
            $offer = $this->database->get_birthday_offer($id);
            
            if (!$offer) {
                wp_send_json_error('Birthday offer not found');
            }
            
            wp_send_json_success($offer);
        } catch (Exception $e) {
            wp_send_json_error('Failed to load birthday offer: ' . $e->getMessage());
        }
    }
    
    public function save_birthday_offer() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        try {
            // Log the incoming POST data for debugging
            error_log('AJAX Birthday offer POST data: ' . print_r($_POST, true));
            
            $data = array(
                'title' => sanitize_text_field($_POST['title'] ?? ''),
                'description' => sanitize_textarea_field($_POST['description'] ?? ''),
                'discount_type' => sanitize_text_field($_POST['discount_type'] ?? 'percentage'),
                'discount_value' => floatval($_POST['discount_value'] ?? 0),
                'status' => sanitize_text_field($_POST['status'] ?? 'active'),
                'terms_conditions' => sanitize_textarea_field($_POST['terms_conditions'] ?? ''),
                
                // New fields for long-term offers
                'offer_duration_type' => sanitize_text_field($_POST['offer_duration_type'] ?? 'long_term'),
                'valid_from' => sanitize_text_field($_POST['valid_from'] ?? ''),
                'valid_until' => sanitize_text_field($_POST['valid_until'] ?? ''),
                
                // Handle applicable tickets as array
                'applicable_tickets' => isset($_POST['applicable_tickets']) && is_array($_POST['applicable_tickets']) 
                    ? $_POST['applicable_tickets'] 
                    : array('general', 'child', 'senior'),
                
                // Map frontend field names to the expected names
                'min_age_requirement' => intval($_POST['min_age_requirement'] ?? 1),
                'max_age_requirement' => !empty($_POST['max_age_requirement']) ? intval($_POST['max_age_requirement']) : '',
                'days_before_birthday' => intval($_POST['days_before_birthday'] ?? 7),
                'days_after_birthday' => intval($_POST['days_after_birthday'] ?? 7),
                'usage_limit_per_booking' => intval($_POST['usage_limit_per_booking'] ?? 1),
                'usage_limit_total' => !empty($_POST['usage_limit_total']) ? intval($_POST['usage_limit_total']) : ''
            );
            
            // Validation
            if (empty($data['title'])) {
                wp_send_json_error('Title is required');
            }
            
            if ($data['discount_value'] <= 0) {
                wp_send_json_error('Discount value must be greater than 0');
            }
            
            if ($data['discount_type'] === 'percentage' && $data['discount_value'] > 100) {
                wp_send_json_error('Percentage discount cannot exceed 100%');
            }
            
            // For specific period offers, validate dates
            if ($data['offer_duration_type'] === 'specific_period') {
                if (empty($data['valid_from']) || empty($data['valid_until'])) {
                    wp_send_json_error('Valid from and valid until dates are required for specific period offers');
                }
                
                if (strtotime($data['valid_from']) > strtotime($data['valid_until'])) {
                    wp_send_json_error('Valid from date must be before valid until date');
                }
            }
            
            if (isset($_POST['id']) && !empty($_POST['id'])) {
                $data['id'] = intval($_POST['id']);
            }
            
            error_log('AJAX Birthday offer processed data: ' . print_r($data, true));
            
            $result = $this->database->save_birthday_offer($data);
            
            if ($result) {
                wp_send_json_success(array('id' => $result, 'message' => 'Birthday offer saved successfully'));
            } else {
                wp_send_json_error('Failed to save birthday offer to database');
            }
        } catch (Exception $e) {
            error_log('Birthday offer save exception: ' . $e->getMessage());
            wp_send_json_error('Failed to save birthday offer: ' . $e->getMessage());
        }
    }
    
    public function delete_birthday_offer() {
        if (!$this->verify_admin_nonce()) {
            wp_die('Invalid nonce');
        }
        
        if (!$this->check_user_capability('edit_posts')) {
            wp_die('Unauthorized');
        }
        
        $id = intval($_POST['id'] ?? 0);
        
        if (!$id) {
            wp_send_json_error('Invalid offer ID');
        }
        
        try {
            $result = $this->database->delete_birthday_offer($id);
            
            if ($result) {
                wp_send_json_success('Birthday offer deleted successfully');
            } else {
                wp_send_json_error('Failed to delete birthday offer');
            }
        } catch (Exception $e) {
            wp_send_json_error('Failed to delete birthday offer: ' . $e->getMessage());
        }
    }

}

// Initialize admin dashboard
if (is_admin()) {
    new MWB_Admin_Dashboard();
}
?>
