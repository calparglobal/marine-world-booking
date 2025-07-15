<?php

class MWB_Booking_Widget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'marine-world-booking';
    }

    public function get_title() {
        return __('Marine World Booking', 'marine-world-booking');
    }

    public function get_icon() {
        return 'eicon-calendar';
    }

    public function get_categories() {
        return ['general'];
    }

    public function get_keywords() {
        return ['booking', 'marine world', 'calendar', 'tickets'];
    }

    protected function register_controls() {
        
        // Content Tab
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('Booking Settings', 'marine-world-booking'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'widget_type',
            [
                'label' => __('Widget Type', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'full_booking',
                'options' => [
                    'full_booking' => __('Full Booking Flow', 'marine-world-booking'),
                    'calendar_only' => __('Calendar Only', 'marine-world-booking'),
                    'quick_book' => __('Quick Book Button', 'marine-world-booking'),
                ],
            ]
        );

        $database = new MWB_Database();
        $locations = $database->get_locations();
        $location_options = ['all' => 'All Locations'];
        
        foreach ($locations as $location) {
            $location_options[$location->id] = $location->name;
        }

        $this->add_control(
            'default_location',
            [
                'label' => __('Default Location', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'all',
                'options' => $location_options,
            ]
        );

        $this->add_control(
            'theme_style',
            [
                'label' => __('Theme Style', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'default',
                'options' => [
                    'default' => __('Default', 'marine-world-booking'),
                    'modern' => __('Modern', 'marine-world-booking'),
                    'classic' => __('Classic', 'marine-world-booking'),
                    'minimal' => __('Minimal', 'marine-world-booking'),
                ],
            ]
        );

        $this->add_control(
            'show_steps',
            [
                'label' => __('Show Steps', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Show', 'marine-world-booking'),
                'label_off' => __('Hide', 'marine-world-booking'),
                'return_value' => 'yes',
                'default' => 'yes',
                'condition' => [
                    'widget_type' => 'full_booking',
                ],
            ]
        );

        $this->add_control(
            'enable_modal',
            [
                'label' => __('Open in Modal', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'marine-world-booking'),
                'label_off' => __('No', 'marine-world-booking'),
                'return_value' => 'yes',
                'default' => 'no',
                'condition' => [
                    'widget_type' => 'quick_book',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab
        $this->start_controls_section(
            'style_section',
            [
                'label' => __('Style', 'marine-world-booking'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'primary_color',
            [
                'label' => __('Primary Color', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#007cba',
                'selectors' => [
                    '{{WRAPPER}} .mwb-primary-btn' => 'background-color: {{VALUE}}',
                    '{{WRAPPER}} .mwb-primary-color' => 'color: {{VALUE}}',
                    '{{WRAPPER}} .mwb-border-primary' => 'border-color: {{VALUE}}',
                ],
            ]
        );

        $this->add_control(
            'secondary_color',
            [
                'label' => __('Secondary Color', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#f0f0f0',
                'selectors' => [
                    '{{WRAPPER}} .mwb-secondary-btn' => 'background-color: {{VALUE}}',
                    '{{WRAPPER}} .mwb-secondary-bg' => 'background-color: {{VALUE}}',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'content_typography',
                'label' => __('Typography', 'marine-world-booking'),
                'selector' => '{{WRAPPER}} .marine-world-booking-container',
            ]
        );

        $this->add_control(
            'container_padding',
            [
                'label' => __('Container Padding', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%', 'em'],
                'selectors' => [
                    '{{WRAPPER}} .marine-world-booking-container' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'container_border',
                'label' => __('Container Border', 'marine-world-booking'),
                'selector' => '{{WRAPPER}} .marine-world-booking-container',
            ]
        );

        $this->add_control(
            'container_border_radius',
            [
                'label' => __('Border Radius', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .marine-world-booking-container' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'container_box_shadow',
                'label' => __('Box Shadow', 'marine-world-booking'),
                'selector' => '{{WRAPPER}} .marine-world-booking-container',
            ]
        );

        $this->end_controls_section();

        // Button Style Section
        $this->start_controls_section(
            'button_style_section',
            [
                'label' => __('Button Style', 'marine-world-booking'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'widget_type' => 'quick_book',
                ],
            ]
        );

        $this->add_control(
            'button_text',
            [
                'label' => __('Button Text', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => __('Book Now', 'marine-world-booking'),
                'condition' => [
                    'widget_type' => 'quick_book',
                ],
            ]
        );

        $this->start_controls_tabs('button_style_tabs');

        $this->start_controls_tab(
            'button_normal_tab',
            [
                'label' => __('Normal', 'marine-world-booking'),
            ]
        );

        $this->add_control(
            'button_text_color',
            [
                'label' => __('Text Color', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .mwb-quick-book-btn' => 'color: {{VALUE}};',
                ],
            ]
        );

        $this->add_control(
            'button_background_color',
            [
                'label' => __('Background Color', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#007cba',
                'selectors' => [
                    '{{WRAPPER}} .mwb-quick-book-btn' => 'background-color: {{VALUE}};',
                ],
            ]
        );

        $this->end_controls_tab();

        $this->start_controls_tab(
            'button_hover_tab',
            [
                'label' => __('Hover', 'marine-world-booking'),
            ]
        );

        $this->add_control(
            'button_hover_text_color',
            [
                'label' => __('Text Color', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .mwb-quick-book-btn:hover' => 'color: {{VALUE}};',
                ],
            ]
        );

        $this->add_control(
            'button_hover_background_color',
            [
                'label' => __('Background Color', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .mwb-quick-book-btn:hover' => 'background-color: {{VALUE}};',
                ],
            ]
        );

        $this->end_controls_tab();
        $this->end_controls_tabs();

        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'button_typography',
                'label' => __('Typography', 'marine-world-booking'),
                'selector' => '{{WRAPPER}} .mwb-quick-book-btn',
            ]
        );

        $this->add_control(
            'button_padding',
            [
                'label' => __('Padding', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'selectors' => [
                    '{{WRAPPER}} .mwb-quick-book-btn' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'button_border_radius',
            [
                'label' => __('Border Radius', 'marine-world-booking'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .mwb-quick-book-btn' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $widget_id = 'mwb-widget-' . $this->get_id();

        // Enqueue necessary scripts and styles
        wp_enqueue_script('marine-world-booking-app');
        wp_enqueue_style('marine-world-booking-styles');

        $widget_data = array(
            'widgetType' => $settings['widget_type'],
            'defaultLocation' => $settings['default_location'],
            'themeStyle' => $settings['theme_style'],
            'showSteps' => $settings['show_steps'] === 'yes',
            'enableModal' => $settings['enable_modal'] === 'yes',
            'buttonText' => $settings['button_text'] ?? 'Book Now',
            'primaryColor' => $settings['primary_color'],
            'secondaryColor' => $settings['secondary_color']
        );

        echo '<div id="' . esc_attr($widget_id) . '" class="marine-world-booking-elementor-widget" data-widget-config="' . esc_attr(json_encode($widget_data)) . '">';

        switch ($settings['widget_type']) {
            case 'full_booking':
                $this->render_full_booking($widget_id, $settings);
                break;
            case 'calendar_only':
                $this->render_calendar_only($widget_id, $settings);
                break;
            case 'quick_book':
                $this->render_quick_book($widget_id, $settings);
                break;
        }

        echo '</div>';

        // Add inline script to initialize the React component
        ?>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                if (typeof MarineWorldBooking !== 'undefined') {
                    const widgetElement = document.getElementById('<?php echo esc_js($widget_id); ?>');
                    const config = JSON.parse(widgetElement.dataset.widgetConfig);
                    MarineWorldBooking.initWidget('<?php echo esc_js($widget_id); ?>', config);
                }
            });
        </script>
        <?php
    }

    private function render_full_booking($widget_id, $settings) {
        ?>
        <div class="marine-world-booking-container full-booking-flow" 
             data-location="<?php echo esc_attr($settings['default_location']); ?>"
             data-theme="<?php echo esc_attr($settings['theme_style']); ?>"
             data-show-steps="<?php echo esc_attr($settings['show_steps']); ?>">
            
            <div class="mwb-loading-placeholder">
                <div class="mwb-spinner"></div>
                <p>Loading Marine World Booking System...</p>
            </div>
        </div>
        <?php
    }

    private function render_calendar_only($widget_id, $settings) {
        ?>
        <div class="marine-world-calendar-container" 
             data-location="<?php echo esc_attr($settings['default_location']); ?>"
             data-theme="<?php echo esc_attr($settings['theme_style']); ?>">
            
            <div class="mwb-loading-placeholder">
                <div class="mwb-spinner"></div>
                <p>Loading Calendar...</p>
            </div>
        </div>
        <?php
    }

    private function render_quick_book($widget_id, $settings) {
        $button_text = $settings['button_text'] ?: 'Book Now';
        $modal_class = $settings['enable_modal'] === 'yes' ? 'mwb-modal-trigger' : '';
        ?>
        <div class="marine-world-quick-book-container">
            <button class="mwb-quick-book-btn <?php echo esc_attr($modal_class); ?>"
                    data-location="<?php echo esc_attr($settings['default_location']); ?>"
                    data-theme="<?php echo esc_attr($settings['theme_style']); ?>">
                <?php echo esc_html($button_text); ?>
            </button>
        </div>
        <?php
    }

    protected function content_template() {
        ?>
        <# 
        var widgetId = 'mwb-widget-' + Math.random().toString(36).substr(2, 9);
        var widgetData = {
            widgetType: settings.widget_type,
            defaultLocation: settings.default_location,
            themeStyle: settings.theme_style,
            showSteps: settings.show_steps === 'yes',
            enableModal: settings.enable_modal === 'yes',
            buttonText: settings.button_text || 'Book Now',
            primaryColor: settings.primary_color,
            secondaryColor: settings.secondary_color
        };
        #>

        <div id="{{ widgetId }}" class="marine-world-booking-elementor-widget" data-widget-config="{{ JSON.stringify(widgetData) }}">
            
            <# if (settings.widget_type === 'full_booking') { #>
                <div class="marine-world-booking-container full-booking-flow" 
                     data-location="{{ settings.default_location }}"
                     data-theme="{{ settings.theme_style }}"
                     data-show-steps="{{ settings.show_steps }}">
                    <div class="mwb-loading-placeholder">
                        <div class="mwb-spinner"></div>
                        <p>Loading Marine World Booking System...</p>
                    </div>
                </div>
            <# } else if (settings.widget_type === 'calendar_only') { #>
                <div class="marine-world-calendar-container" 
                     data-location="{{ settings.default_location }}"
                     data-theme="{{ settings.theme_style }}">
                    <div class="mwb-loading-placeholder">
                        <div class="mwb-spinner"></div>
                        <p>Loading Calendar...</p>
                    </div>
                </div>
            <# } else if (settings.widget_type === 'quick_book') { #>
                <div class="marine-world-quick-book-container">
                    <button class="mwb-quick-book-btn <# if (settings.enable_modal === 'yes') { #>mwb-modal-trigger<# } #>"
                            data-location="{{ settings.default_location }}"
                            data-theme="{{ settings.theme_style }}">
                        {{ settings.button_text || 'Book Now' }}
                    </button>
                </div>
            <# } #>
        </div>
        <?php
    }
}

// Register the widget with Elementor
if (class_exists('\Elementor\Plugin')) {
    add_action('elementor/widgets/widgets_registered', function() {
        \Elementor\Plugin::instance()->widgets_manager->register_widget_type(new MWB_Booking_Widget());
    });
}
?>