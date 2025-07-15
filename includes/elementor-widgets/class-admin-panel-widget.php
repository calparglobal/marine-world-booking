<?php

class MWB_Admin_Panel_Widget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'marine-world-admin-panel';
    }

    public function get_title() {
        return __('Marine World Admin Panel', 'marine-world-booking');
    }

    public function get_icon() {
        return 'eicon-dashboard';
    }

    public function get_categories() {
        return ['general'];
    }

    public function get_keywords() {
        return ['admin', 'dashboard', 'marine world', 'management', 'bookings'];
    }

    public function get_script_depends() {
        return ['marine-world-admin'];
    }

    public function get_style_depends() {
        return ['marine-world-admin-styles'];
    }

    protected function register_controls() {
        
        // Access Control Section
        $this->start_controls_section(
            'access_control_section',
            [
                'label' => __('Access Control', 'marine-world-booking'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'required_capability',
            [
                'label' => __('Required User Capability', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'edit_posts',
                'options' => [
                    'read' => __('Subscriber (read)', 'marine-world-booking'),
                    'edit_posts' => __('Contributor (edit_posts)', 'marine-world-booking'),
                    'publish_posts' => __('Author (publish_posts)', 'marine-world-booking'),
                    'edit_pages' => __('Editor (edit_pages)', 'marine-world-booking'),
                    'manage_options' => __('Administrator (manage_options)', 'marine-world-booking'),
                ],
                'description' => __('Minimum user capability required to access this admin panel', 'marine-world-booking'),
            ]
        );

        $this->add_control(
            'show_login_form',
            [
                'label' => __('Show Login Form for Guests', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'marine-world-booking'),
                'label_off' => __('No', 'marine-world-booking'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );

        $this->end_controls_section();

        // Panel Features Section
        $this->start_controls_section(
            'panel_features_section',
            [
                'label' => __('Panel Features', 'marine-world-booking'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'enabled_features',
            [
                'label' => __('Enabled Features', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'multiple' => true,
                'default' => ['dashboard', 'bookings', 'analytics'],
                'options' => [
                    'dashboard' => __('Dashboard Overview', 'marine-world-booking'),
                    'bookings' => __('Bookings Management', 'marine-world-booking'),
                    'availability' => __('Availability Management', 'marine-world-booking'),
                    'analytics' => __('Analytics & Reports', 'marine-world-booking'),
                    'settings' => __('Settings', 'marine-world-booking'),
                    'addons' => __('Add-ons Management', 'marine-world-booking'),
                    'locations' => __('Locations Management', 'marine-world-booking'),
                    'promo_codes' => __('Promo Codes', 'marine-world-booking'),
                    'birthday_offers' => __('Birthday Offers', 'marine-world-booking'),
                    'pricing' => __('Pricing Management', 'marine-world-booking'),
                ],
                'description' => __('Select which features to show in the admin panel', 'marine-world-booking'),
            ]
        );

        $this->add_control(
            'default_tab',
            [
                'label' => __('Default Tab', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'dashboard',
                'options' => [
                    'dashboard' => __('Dashboard', 'marine-world-booking'),
                    'bookings' => __('Bookings', 'marine-world-booking'),
                    'availability' => __('Availability', 'marine-world-booking'),
                    'analytics' => __('Analytics', 'marine-world-booking'),
                    'settings' => __('Settings', 'marine-world-booking'),
                    'addons' => __('Add-ons', 'marine-world-booking'),
                    'locations' => __('Locations', 'marine-world-booking'),
                    'promo_codes' => __('Promo Codes', 'marine-world-booking'),
                    'birthday_offers' => __('Birthday Offers', 'marine-world-booking'),
                    'pricing' => __('Pricing', 'marine-world-booking'),
                ],
            ]
        );

        $this->end_controls_section();

        // Style Section
        $this->start_controls_section(
            'style_section',
            [
                'label' => __('Style', 'marine-world-booking'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'panel_theme',
            [
                'label' => __('Panel Theme', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'default',
                'options' => [
                    'default' => __('Default (WordPress Admin)', 'marine-world-booking'),
                    'modern' => __('Modern', 'marine-world-booking'),
                    'minimal' => __('Minimal', 'marine-world-booking'),
                    'custom' => __('Custom', 'marine-world-booking'),
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'panel_typography',
                'label' => __('Typography', 'marine-world-booking'),
                'selector' => '{{WRAPPER}} .mwb-frontend-admin-panel',
            ]
        );

        $this->add_control(
            'panel_background_color',
            [
                'label' => __('Background Color', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#f1f1f1',
                'selectors' => [
                    '{{WRAPPER}} .mwb-frontend-admin-panel' => 'background-color: {{VALUE}}',
                ],
            ]
        );

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        
        // Check user permissions
        if (!is_user_logged_in()) {
            if ($settings['show_login_form'] === 'yes') {
                $this->render_login_form();
            } else {
                echo '<div class="mwb-access-denied">';
                echo '<p>' . __('Please log in to access the admin panel.', 'marine-world-booking') . '</p>';
                echo '</div>';
            }
            return;
        }

        if (!current_user_can($settings['required_capability'])) {
            echo '<div class="mwb-access-denied">';
            echo '<p>' . __('You do not have permission to access this admin panel.', 'marine-world-booking') . '</p>';
            echo '</div>';
            return;
        }

        // Render the admin panel
        $this->render_admin_panel($settings);
    }

    private function render_login_form() {
        $current_url = get_permalink();
        ?>
        <div class="mwb-frontend-login">
            <h3><?php _e('Access Marine World Admin Panel', 'marine-world-booking'); ?></h3>
            <form method="post" action="<?php echo wp_login_url($current_url); ?>">
                <p>
                    <label for="user_login"><?php _e('Username or Email', 'marine-world-booking'); ?></label>
                    <input type="text" name="log" id="user_login" class="input" required />
                </p>
                <p>
                    <label for="user_pass"><?php _e('Password', 'marine-world-booking'); ?></label>
                    <input type="password" name="pwd" id="user_pass" class="input" required />
                </p>
                <p>
                    <label>
                        <input name="rememberme" type="checkbox" value="forever" />
                        <?php _e('Remember Me', 'marine-world-booking'); ?>
                    </label>
                </p>
                <p>
                    <input type="submit" name="wp-submit" class="button button-primary" value="<?php _e('Log In', 'marine-world-booking'); ?>" />
                    <input type="hidden" name="redirect_to" value="<?php echo esc_url($current_url); ?>" />
                </p>
            </form>
        </div>
        <?php
    }

    private function render_admin_panel($settings) {
        $enabled_features = $settings['enabled_features'];
        $default_tab = $settings['default_tab'];
        $panel_theme = $settings['panel_theme'];

        // Generate unique ID for this widget instance
        $widget_id = 'mwb-frontend-admin-' . $this->get_id();
        ?>
        <div class="mwb-frontend-admin-panel mwb-theme-<?php echo esc_attr($panel_theme); ?>" id="<?php echo esc_attr($widget_id); ?>">
            
            <!-- Admin Panel Header -->
            <div class="mwb-admin-header">
                <h2 class="mwb-admin-title">
                    <span class="dashicons dashicons-admin-site"></span>
                    <?php _e('Marine World Management Panel', 'marine-world-booking'); ?>
                </h2>
                <div class="mwb-user-info">
                    <?php
                    $current_user = wp_get_current_user();
                    echo '<span>' . esc_html($current_user->display_name) . '</span>';
                    echo '<a href="' . wp_logout_url(get_permalink()) . '" class="mwb-logout-link">' . __('Logout', 'marine-world-booking') . '</a>';
                    ?>
                </div>
            </div>

            <!-- Navigation Tabs -->
            <div class="mwb-admin-nav">
                <nav class="nav-tab-wrapper">
                    <?php
                    $tab_labels = [
                        'dashboard' => __('Dashboard', 'marine-world-booking'),
                        'bookings' => __('Bookings', 'marine-world-booking'),
                        'availability' => __('Availability', 'marine-world-booking'),
                        'analytics' => __('Analytics', 'marine-world-booking'),
                        'settings' => __('Settings', 'marine-world-booking'),
                        'addons' => __('Add-ons', 'marine-world-booking'),
                        'locations' => __('Locations', 'marine-world-booking'),
                        'promo_codes' => __('Promo Codes', 'marine-world-booking'),
                        'birthday_offers' => __('Birthday Offers', 'marine-world-booking'),
                        'pricing' => __('Pricing', 'marine-world-booking'),
                    ];

                    foreach ($enabled_features as $feature) {
                        if (isset($tab_labels[$feature])) {
                            $active_class = ($feature === $default_tab) ? ' nav-tab-active' : '';
                            echo '<a href="#' . esc_attr($feature) . '" class="nav-tab' . $active_class . '" data-tab="' . esc_attr($feature) . '">';
                            echo esc_html($tab_labels[$feature]);
                            echo '</a>';
                        }
                    }
                    ?>
                </nav>
            </div>

            <!-- Tab Content Containers -->
            <div class="mwb-admin-content">
                <?php foreach ($enabled_features as $feature) : ?>
                    <div id="<?php echo esc_attr($feature); ?>" class="mwb-tab-content" style="<?php echo ($feature !== $default_tab) ? 'display: none;' : ''; ?>">
                        <?php $this->render_tab_content($feature); ?>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <script type="text/javascript">
        function initializeMWBFrontendAdmin(retryCount = 0) {
            // Initialize the frontend admin panel
            const panelId = '<?php echo esc_js($widget_id); ?>';
            const panel = document.getElementById(panelId);
            
            if (panel && typeof window.MWBFrontendAdmin !== 'undefined') {
                window.MWBFrontendAdmin.init(panelId, {
                    defaultTab: '<?php echo esc_js($default_tab); ?>',
                    enabledFeatures: <?php echo json_encode($enabled_features); ?>
                });
            } else if (typeof window.MWBFrontendAdmin === 'undefined' && retryCount < 10) {
                // Retry after a short delay if MWBFrontendAdmin is not loaded yet (max 10 retries)
                setTimeout(() => initializeMWBFrontendAdmin(retryCount + 1), 100);
            } else if (retryCount >= 10) {
                console.error('Failed to initialize Marine World Frontend Admin: Script not loaded after 10 retries');
            }
        }

        // Check if DOM is already loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeMWBFrontendAdmin);
        } else {
            // DOM is already loaded, initialize immediately
            initializeMWBFrontendAdmin();
        }
        </script>
        <?php
    }

    private function render_tab_content($feature) {
        echo '<div id="mwb-frontend-' . esc_attr($feature) . '-container" class="mwb-feature-container">';
        
        switch ($feature) {
            case 'dashboard':
                echo '<div id="mwb-frontend-dashboard" class="mwb-react-container"></div>';
                break;
            case 'bookings':
                echo '<div id="mwb-frontend-bookings" class="mwb-react-container"></div>';
                break;
            case 'availability':
                echo '<div id="mwb-frontend-availability" class="mwb-react-container"></div>';
                break;
            case 'analytics':
                echo '<div id="mwb-frontend-analytics" class="mwb-react-container"></div>';
                break;
            case 'settings':
                echo '<div id="mwb-frontend-settings" class="mwb-react-container"></div>';
                break;
            case 'addons':
                echo '<div id="mwb-frontend-addons" class="mwb-react-container"></div>';
                break;
            case 'locations':
                echo '<div id="mwb-frontend-locations" class="mwb-react-container"></div>';
                break;
            case 'promo_codes':
                echo '<div id="mwb-frontend-promo_codes" class="mwb-react-container"></div>';
                break;
            case 'birthday_offers':
                echo '<div id="mwb-frontend-birthday_offers" class="mwb-react-container"></div>';
                break;
            case 'pricing':
                echo '<div id="mwb-frontend-pricing" class="mwb-react-container"></div>';
                break;
            default:
                echo '<p>' . sprintf(__('Feature "%s" is not yet implemented.', 'marine-world-booking'), esc_html($feature)) . '</p>';
        }
        
        echo '</div>';
    }

    protected function content_template() {
        ?>
        <div class="mwb-frontend-admin-panel mwb-elementor-editor">
            <div class="mwb-admin-header">
                <h2><?php _e('Marine World Management Panel', 'marine-world-booking'); ?></h2>
                <p><?php _e('This is a preview. The actual admin panel will be shown to logged-in users with appropriate permissions.', 'marine-world-booking'); ?></p>
            </div>
            <div class="mwb-admin-nav">
                <nav class="nav-tab-wrapper">
                    <a href="#" class="nav-tab nav-tab-active"><?php _e('Dashboard', 'marine-world-booking'); ?></a>
                    <a href="#" class="nav-tab"><?php _e('Bookings', 'marine-world-booking'); ?></a>
                    <a href="#" class="nav-tab"><?php _e('Analytics', 'marine-world-booking'); ?></a>
                    <a href="#" class="nav-tab"><?php _e('Settings', 'marine-world-booking'); ?></a>
                </nav>
            </div>
            <div class="mwb-admin-content">
                <p><?php _e('Admin panel content will appear here based on selected features and user permissions.', 'marine-world-booking'); ?></p>
            </div>
        </div>
        <?php
    }
}