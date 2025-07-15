<?php
/**
 * Marine World Booking REST API Class
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class MWB_REST_API {
    
    private $database;
    private $namespace = 'marine-world/v1';
    
    public function __construct() {
        $this->database = new MWB_Database();
    }
    
    /**
     * Initialize REST API
     */
    public function init() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        // Locations endpoints
        register_rest_route($this->namespace, '/locations', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_locations'),
            'permission_callback' => '__return_true',
            'args' => array()
        ));
        
        register_rest_route($this->namespace, '/locations/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_location'),
            'permission_callback' => '__return_true',
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                )
            )
        ));
        
        // Availability endpoints
        register_rest_route($this->namespace, '/availability', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_availability'),
            'permission_callback' => '__return_true',
            'args' => array(
                'location_id' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                ),
                'date_from' => array(
                    'required' => true,
                    'validate_callback' => array($this, 'validate_date')
                ),
                'date_to' => array(
                    'required' => false,
                    'validate_callback' => array($this, 'validate_date')
                )
            )
        ));
        
        // Pricing calculation endpoint
        register_rest_route($this->namespace, '/pricing/calculate', array(
            'methods' => 'POST',
            'callback' => array($this, 'calculate_pricing'),
            'permission_callback' => '__return_true',
            'args' => array(
                'tickets' => array('required' => true),
                'addons' => array('required' => false),
                'promo_code' => array('required' => false),
                'booking_date' => array(
                    'required' => true,
                    'validate_callback' => array($this, 'validate_date')
                )
            )
        ));
        
        // Promo code validation
        register_rest_route($this->namespace, '/promo-code/validate', array(
            'methods' => 'POST',
            'callback' => array($this, 'validate_promo_code'),
            'permission_callback' => '__return_true',
            'args' => array(
                'code' => array('required' => true),
                'amount' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                )
            )
        ));
        
        // Add-ons endpoint
        register_rest_route($this->namespace, '/addons', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_addons'),
            'permission_callback' => '__return_true'
        ));
        
        // Booking endpoints
        register_rest_route($this->namespace, '/booking', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_booking'),
            'permission_callback' => '__return_true',
            'args' => array(
                'location_id' => array('required' => true),
                'booking_date' => array('required' => true),
                'customer_name' => array('required' => true),
                'customer_email' => array('required' => true),
                'customer_phone' => array('required' => true),
                'customer_pincode' => array('required' => true),
                'tickets' => array('required' => true),
                'addons' => array('required' => false),
                'promo_code' => array('required' => false)
            )
        ));
        
        register_rest_route($this->namespace, '/booking/(?P<booking_id>[a-zA-Z0-9]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_booking'),
            'permission_callback' => '__return_true',
            'args' => array(
                'booking_id' => array(
                    'validate_callback' => function($param) {
                        return !empty($param);
                    }
                )
            )
        ));
        
        // Payment confirmation endpoint
        register_rest_route($this->namespace, '/booking/(?P<booking_id>[a-zA-Z0-9]+)/payment', array(
            'methods' => 'POST',
            'callback' => array($this, 'confirm_payment'),
            'permission_callback' => '__return_true',
            'args' => array(
                'payment_id' => array('required' => true),
                'payment_status' => array('required' => true)
            )
        ));
        
        // Admin endpoints (require admin permissions)
        register_rest_route($this->namespace, '/admin/bookings', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_admin_bookings'),
            'permission_callback' => array($this, 'check_admin_permission'),
            'args' => array(
                'page' => array('default' => 1),
                'per_page' => array('default' => 20),
                'date_from' => array('required' => false),
                'date_to' => array('required' => false),
                'location_id' => array('required' => false),
                'status' => array('required' => false)
            )
        ));
        
        register_rest_route($this->namespace, '/admin/stats', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_admin_stats'),
            'permission_callback' => array($this, 'check_admin_permission'),
            'args' => array(
                'location_id' => array('required' => false),
                'date_from' => array('required' => false),
                'date_to' => array('required' => false)
            )
        ));
        
        // Availability management (admin only)
        register_rest_route($this->namespace, '/admin/availability', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_availability'),
            'permission_callback' => array($this, 'check_admin_permission'),
            'args' => array(
                'location_id' => array('required' => true),
                'date' => array('required' => true),
                'capacity' => array('required' => false),
                'status' => array('required' => false),
                'special_pricing' => array('required' => false),
                'is_blackout' => array('required' => false)
            )
        ));



        // Add new route for getting current ticket prices
        register_rest_route($this->namespace, '/pricing/current', array(
            'methods' => 'GET',
             'callback' => array($this, 'get_current_pricing'),
             'permission_callback' => '__return_true',
              'args' => array(
             'date' => array(
            'required' => false,
            'validate_callback' => array($this, 'validate_date')
             )
            )
        ));

        // Birthday offers endpoints
        register_rest_route($this->namespace, '/birthday-offers', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_birthday_offers'),
            'permission_callback' => '__return_true',
            'args' => array()
        ));

        register_rest_route($this->namespace, '/birthday-offers/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_birthday_offer'),
            'permission_callback' => '__return_true',
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                )
            )
        ));

        register_rest_route($this->namespace, '/birthday-offers/validate', array(
            'methods' => 'POST',
            'callback' => array($this, 'validate_birthday_offer'),
            'permission_callback' => '__return_true',
            'args' => array(
                'offer_id' => array('required' => true),
                'name' => array('required' => true),
                'dob' => array('required' => true),
                'booking_date' => array('required' => true)
            )
        ));

        // Admin birthday offers management
        register_rest_route($this->namespace, '/admin/birthday-offers', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_admin_birthday_offers'),
            'permission_callback' => array($this, 'check_admin_permission'),
            'args' => array()
        ));

        register_rest_route($this->namespace, '/admin/birthday-offers', array(
            'methods' => 'POST',
            'callback' => array($this, 'save_birthday_offer'),
            'permission_callback' => array($this, 'check_admin_permission'),
            'args' => array(
                'title' => array('required' => true),
                'description' => array('required' => true),
                'discount_type' => array('required' => true),
                'discount_value' => array('required' => true)
            )
        ));

        register_rest_route($this->namespace, '/admin/birthday-offers/(?P<id>\d+)', array(
            'methods' => 'PUT',
            'callback' => array($this, 'update_birthday_offer'),
            'permission_callback' => array($this, 'check_admin_permission'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                )
            )
        ));

        register_rest_route($this->namespace, '/admin/birthday-offers/(?P<id>\d+)', array(
            'methods' => 'DELETE',
            'callback' => array($this, 'delete_birthday_offer'),
            'permission_callback' => array($this, 'check_admin_permission'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                )
            )
        ));
    }
    
    /**
     * Get locations
     */
    public function get_locations($request) {
        try {
            $locations = $this->database->get_locations();
            
            if (empty($locations)) {
                return new WP_Error('no_locations', __('No locations found', 'marine-world-booking'), array('status' => 404));
            }
            
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
                    'status' => $location->status
                );
            }, $locations);
            
            return rest_ensure_response($formatted_locations);
            
        } catch (Exception $e) {
            return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Get single location
     */
    public function get_location($request) {
        try {
            $location_id = $request->get_param('id');
            $location = $this->database->get_location($location_id);
            
            if (!$location) {
                return new WP_Error('location_not_found', __('Location not found', 'marine-world-booking'), array('status' => 404));
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
            
            return rest_ensure_response($formatted_location);
            
        } catch (Exception $e) {
            return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Get availability
     */
    public function get_availability($request) {
        try {
            $location_id = $request->get_param('location_id');
            $date_from = $request->get_param('date_from');
            $date_to = $request->get_param('date_to') ?: $date_from;
            
            // Check cache first
            $cache_key = 'mwb_availability_' . md5($location_id . $date_from . $date_to);
            $cached_data = wp_cache_get($cache_key, 'marine_world');
            
            if ($cached_data !== false) {
                return rest_ensure_response($cached_data);
            }
            
            $availability = $this->database->get_availability($location_id, $date_from, $date_to);
            
            if (empty($availability)) {
                return new WP_Error('no_availability', __('No availability data found', 'marine-world-booking'), array('status' => 404));
            }
            
            $formatted_availability = array_map(function($day) {
                return array(
                    'date' => $day->availability_date,
                    'total_capacity' => (int) $day->total_capacity,
                    'available_slots' => (int) $day->available_slots,
                    'booked_slots' => (int) $day->booked_slots,
                    'status' => $day->status,
                    'special_pricing' => $day->special_pricing ? (float) $day->special_pricing : null,
                    'is_blackout' => (bool) $day->is_blackout,
                    'notes' => $day->notes
                );
            }, $availability);
            
            // Cache for 5 minutes
            wp_cache_set($cache_key, $formatted_availability, 'marine_world', 300);
            
            return rest_ensure_response($formatted_availability);
            
        } catch (Exception $e) {
            return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Calculate pricing
     */
    public function calculate_pricing($request) {
        try {
            $tickets = $request->get_param('tickets');
            $offer_tickets = $request->get_param('offer_tickets') ?: array();
            $addons = $request->get_param('addons') ?: array();
            $promo_code = $request->get_param('promo_code');
            $booking_date = $request->get_param('booking_date');
            
           // Get current ticket prices (dynamic or default)
            $ticket_prices = $this->get_current_ticket_prices($booking_date);
            
            // Calculate tickets subtotal
            $tickets_subtotal = 0;
            $total_tickets = 0;
            $ticket_breakdown = array();
            
            foreach ($tickets as $type => $quantity) {
                $quantity = (int) $quantity;
                if ($quantity > 0 && isset($ticket_prices[$type])) {
                    $price = $ticket_prices[$type];
                    $line_total = $price * $quantity;
                    $tickets_subtotal += $line_total;
                    $total_tickets += $quantity;
                    
                    $ticket_breakdown[$type] = array(
                        'quantity' => $quantity,
                        'price' => $price,
                        'total' => $line_total
                    );
                }
            }
            
            // Calculate offer tickets subtotal with discounts
            $offer_tickets_subtotal = 0;
            $offer_ticket_breakdown = array();
            $birthday_discount_rate = get_option('mwb_birthday_discount_rate', 10);
            
            foreach ($offer_tickets as $type => $quantity) {
                $quantity = (int) $quantity;
                if ($quantity > 0) {
                    if ($type === 'birthday') {
                        // Apply birthday discount - use general ticket price as base
                        $base_price = $ticket_prices['general'] ?? 400;
                        $discounted_price = $base_price * (100 - $birthday_discount_rate) / 100;
                        $line_total = $discounted_price * $quantity;
                        $offer_tickets_subtotal += $line_total;
                        $total_tickets += $quantity;
                        
                        $offer_ticket_breakdown[$type] = array(
                            'quantity' => $quantity,
                            'base_price' => $base_price,
                            'discount_rate' => $birthday_discount_rate,
                            'price' => $discounted_price,
                            'total' => $line_total
                        );
                    }
                }
            }
            
            // Calculate addons subtotal
            $addons_subtotal = 0;
            $addon_breakdown = array();
            $addon_items = $this->database->get_addons();
            $addon_prices = array();
            
            foreach ($addon_items as $addon) {
                $addon_prices[$addon->id] = (float) $addon->price;
            }
            
            foreach ($addons as $addon_id => $quantity) {
                $quantity = (int) $quantity;
                if ($quantity > 0 && isset($addon_prices[$addon_id])) {
                    $price = $addon_prices[$addon_id];
                    $line_total = $price * $quantity;
                    $addons_subtotal += $line_total;
                    
                    $addon_breakdown[$addon_id] = array(
                        'quantity' => $quantity,
                        'price' => $price,
                        'total' => $line_total
                    );
                }
            }
            
            $subtotal = $tickets_subtotal + $offer_tickets_subtotal + $addons_subtotal;
            
            // Apply group discounts
            $group_discount = 0;
            $group_discount_percentage = 0;
            
            if ($total_tickets >= 30) {
                $group_discount_percentage = get_option('mwb_group_discount_30', 10);
            } elseif ($total_tickets >= 15) {
                $group_discount_percentage = get_option('mwb_group_discount_15', 5);
            }
            
            if ($group_discount_percentage > 0) {
                $group_discount = ($subtotal * $group_discount_percentage) / 100;
            }
            
            // Apply promo code discount
            $promo_discount = 0;
            $promo_details = null;
            
            if ($promo_code) {
                $promo = $this->database->get_promo_code($promo_code);
                if ($promo) {
                    if ($promo->discount_type === 'percentage') {
                        $promo_discount = ($subtotal * $promo->discount_value) / 100;
                        if ($promo->maximum_discount && $promo_discount > $promo->maximum_discount) {
                            $promo_discount = $promo->maximum_discount;
                        }
                    } else {
                        $promo_discount = $promo->discount_value;
                    }
                    
                    $promo_details = array(
                        'code' => $promo->code,
                        'description' => $promo->description,
                        'discount_type' => $promo->discount_type,
                        'discount_value' => (float) $promo->discount_value,
                        'applied_discount' => $promo_discount
                    );
                }
            }
            
            // Calculate total discount (group and promo can stack)
            $total_discount = $group_discount + $promo_discount;
            
            $final_total = max(0, $subtotal - $total_discount);
            
            $response = array(
                'subtotal' => $subtotal,
                'tickets_subtotal' => $tickets_subtotal,
                'offer_tickets_subtotal' => $offer_tickets_subtotal,
                'addons_subtotal' => $addons_subtotal,
                'group_discount' => $group_discount,
                'group_discount_percentage' => $group_discount_percentage,
                'promo_discount' => $promo_discount,
                'total_discount' => $total_discount,
                'final_total' => $final_total,
                'total_tickets' => $total_tickets,
                'breakdown' => array(
                    'tickets' => $ticket_breakdown,
                    'offer_tickets' => $offer_ticket_breakdown,
                    'addons' => $addon_breakdown
                ),
                'promo_details' => $promo_details,
                'currency' => get_option('mwb_currency', '₹')
            );
            
            return rest_ensure_response($response);
            
        } catch (Exception $e) {
            return new WP_Error('pricing_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Validate promo code
     */
    public function validate_promo_code($request) {
        try {
            $code = $request->get_param('code');
            $amount = (float) $request->get_param('amount');
            
            $promo = $this->database->get_promo_code($code);
            
            if (!$promo) {
                return new WP_Error('invalid_promo', __('Invalid promo code', 'marine-world-booking'), array('status' => 400));
            }
            
            // Check usage limit
            if ($promo->usage_limit && $promo->used_count >= $promo->usage_limit) {
                return new WP_Error('promo_limit_exceeded', __('Promo code usage limit exceeded', 'marine-world-booking'), array('status' => 400));
            }
            
            // Check minimum amount
            if ($promo->minimum_amount && $amount < $promo->minimum_amount) {
                return new WP_Error('minimum_amount_not_met', 
                    sprintf(__('Minimum amount of %s%s required', 'marine-world-booking'), 
                           get_option('mwb_currency', '₹'), 
                           number_format($promo->minimum_amount, 2)),
                    array('status' => 400)
                );
            }
            
            return rest_ensure_response(array(
                'valid' => true,
                'code' => $promo->code,
                'description' => $promo->description,
                'discount_type' => $promo->discount_type,
                'discount_value' => (float) $promo->discount_value,
                'maximum_discount' => $promo->maximum_discount ? (float) $promo->maximum_discount : null,
                'minimum_amount' => (float) $promo->minimum_amount
            ));
            
        } catch (Exception $e) {
            return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Get add-ons
     */
    public function get_addons($request) {
        try {
            $addons = $this->database->get_addons();
            
            $formatted_addons = array_map(function($addon) {
                return array(
                    'id' => (int) $addon->id,
                    'name' => $addon->name,
                    'description' => $addon->description,
                    'price' => (float) $addon->price,
                    'image_url' => $addon->image_url,
                    'display_order' => (int) $addon->display_order
                );
            }, $addons);
            
            return rest_ensure_response($formatted_addons);
            
        } catch (Exception $e) {
            return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Create booking
     */
    public function create_booking($request) {
        try {
            // Get and validate parameters
            $location_id = (int) $request->get_param('location_id');
            $booking_date = $request->get_param('booking_date');
            $customer_name = sanitize_text_field($request->get_param('customer_name'));
            $customer_email = sanitize_email($request->get_param('customer_email'));
            $customer_phone = sanitize_text_field($request->get_param('customer_phone'));
            $customer_pincode = sanitize_text_field($request->get_param('customer_pincode'));
            $tickets = $request->get_param('tickets');
            $addons = $request->get_param('addons') ?: array();
            $promo_code = $request->get_param('promo_code');
            
            // Validate required fields
            if (empty($customer_name) || empty($customer_email) || empty($customer_phone)) {
                return new WP_Error('missing_required_fields', __('Missing required customer information', 'marine-world-booking'), array('status' => 400));
            }
            
            if (!is_email($customer_email)) {
                return new WP_Error('invalid_email', __('Invalid email address', 'marine-world-booking'), array('status' => 400));
            }
            
            // Check availability
            $availability = $this->database->get_availability($location_id, $booking_date, $booking_date);
            if (empty($availability) || $availability[0]->status === 'sold_out' || $availability[0]->is_blackout) {
                return new WP_Error('not_available', __('Selected date is not available', 'marine-world-booking'), array('status' => 400));
            }
            
            // Calculate total tickets
            $total_tickets = 0;
            foreach ($tickets as $type => $quantity) {
                $total_tickets += (int) $quantity;
            }
            
            if ($total_tickets <= 0) {
                return new WP_Error('no_tickets', __('At least one ticket must be selected', 'marine-world-booking'), array('status' => 400));
            }
            
            // Check if enough slots available
            if ($availability[0]->available_slots < $total_tickets) {
                return new WP_Error('insufficient_availability', 
                    sprintf(__('Only %d tickets available', 'marine-world-booking'), $availability[0]->available_slots),
                    array('status' => 400)
                );
            }
            
            // Calculate pricing
            $pricing_request = new WP_REST_Request('POST');
            $pricing_request->set_param('tickets', $tickets);
            $pricing_request->set_param('addons', $addons);
            $pricing_request->set_param('promo_code', $promo_code);
            $pricing_request->set_param('booking_date', $booking_date);
            
            $pricing_response = $this->calculate_pricing($pricing_request);
            
            if (is_wp_error($pricing_response)) {
                return $pricing_response;
            }
            
            $pricing_data = $pricing_response->get_data();
            
            // Prepare booking data
            $booking_data = array(
                'location_id' => $location_id,
                'booking_date' => $booking_date,
                'customer_name' => $customer_name,
                'customer_email' => $customer_email,
                'customer_phone' => $customer_phone,
                'customer_pincode' => $customer_pincode,
                'general_tickets' => (int) ($tickets['general'] ?? 0),
                'child_tickets' => (int) ($tickets['child'] ?? 0),
                'senior_tickets' => (int) ($tickets['senior'] ?? 0),
                'addons_data' => json_encode($addons),
                'subtotal' => $pricing_data['subtotal'],
                'discount_amount' => $pricing_data['total_discount'],
                'discount_type' => $pricing_data['discount_type'],
                'promo_code' => $promo_code,
                'total_amount' => $pricing_data['final_total'],
                'payment_status' => 'pending',
                'booking_status' => 'pending'
            );
            
            // Handle third party booking
            if ($request->get_param('third_party_booking')) {
                $booking_data['third_party_booking'] = 1;
                $booking_data['third_party_name'] = sanitize_text_field($request->get_param('third_party_name'));
                $booking_data['third_party_email'] = sanitize_email($request->get_param('third_party_email'));
                $booking_data['third_party_phone'] = sanitize_text_field($request->get_param('third_party_phone'));
            }
            
            // Create booking
            $booking_id = $this->database->create_booking($booking_data);
            
            if (!$booking_id) {
                return new WP_Error('booking_creation_failed', __('Failed to create booking', 'marine-world-booking'), array('status' => 500));
            }
            
            // Clear availability cache
            $cache_key = 'mwb_availability_' . md5($location_id . $booking_date . $booking_date);
            wp_cache_delete($cache_key, 'marine_world');
            
            // Use promo code if provided and valid
            if ($promo_code && $pricing_data['promo_details']) {
                $this->database->use_promo_code($promo_code);
            }
            
            return rest_ensure_response(array(
                'success' => true,
                'booking_id' => $booking_id,
                'total_amount' => $pricing_data['final_total'],
                'currency' => get_option('mwb_currency', '₹'),
                'payment_required' => true,
                'message' => __('Booking created successfully', 'marine-world-booking')
            ));
            
        } catch (Exception $e) {
            return new WP_Error('booking_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Get booking details
     */
    public function get_booking($request) {
        try {
            $booking_id = $request->get_param('booking_id');
            $booking = $this->database->get_booking($booking_id);
            
            if (!$booking) {
                return new WP_Error('booking_not_found', __('Booking not found', 'marine-world-booking'), array('status' => 404));
            }
            
            $formatted_booking = array(
                'booking_id' => $booking->booking_id,
                'location_id' => (int) $booking->location_id,
                'booking_date' => $booking->booking_date,
                'customer_name' => $booking->customer_name,
                'customer_email' => $booking->customer_email,
                'customer_phone' => $booking->customer_phone,
                'customer_pincode' => $booking->customer_pincode,
                'third_party_booking' => (bool) $booking->third_party_booking,
                'third_party_name' => $booking->third_party_name,
                'third_party_email' => $booking->third_party_email,
                'third_party_phone' => $booking->third_party_phone,
                'tickets' => array(
                    'general' => (int) $booking->general_tickets,
                    'child' => (int) $booking->child_tickets,
                    'senior' => (int) $booking->senior_tickets
                ),
                'addons' => json_decode($booking->addons_data, true) ?: array(),
                'subtotal' => (float) $booking->subtotal,
                'discount_amount' => (float) $booking->discount_amount,
                'discount_type' => $booking->discount_type,
                'promo_code' => $booking->promo_code,
                'total_amount' => (float) $booking->total_amount,
                'payment_status' => $booking->payment_status,
                'payment_id' => $booking->payment_id,
                'payment_method' => $booking->payment_method,
                'booking_status' => $booking->booking_status,
                'qr_code' => $booking->qr_code,
                'tickets_claimed' => (bool) $booking->tickets_claimed,
                'claimed_at' => $booking->claimed_at,
                'created_at' => $booking->created_at,
                'updated_at' => $booking->updated_at
            );
            
            return rest_ensure_response($formatted_booking);
            
        } catch (Exception $e) {
            return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Confirm payment
     */
    public function confirm_payment($request) {
        try {
            $booking_id = $request->get_param('booking_id');
            $payment_id = $request->get_param('payment_id');
            $payment_status = $request->get_param('payment_status');
            $failure_reason = $request->get_param('failure_reason'); // Optional failure reason
            
            if ($payment_status === 'success' || $payment_status === 'completed') {
                $result = $this->database->update_booking_status($booking_id, 'confirmed', $payment_id);
                
                if ($result) {
                    // Send confirmation notifications
                    $this->send_booking_confirmations($booking_id);
                    
                    // Clear availability cache
                    $booking = $this->database->get_booking($booking_id);
                    if ($booking) {
                        $cache_key = 'mwb_availability_' . md5($booking->location_id . $booking->booking_date . $booking->booking_date);
                        wp_cache_delete($cache_key, 'marine_world');
                    }
                    
                    return rest_ensure_response(array(
                        'success' => true,
                        'message' => __('Payment confirmed successfully', 'marine-world-booking'),
                        'booking_status' => 'confirmed'
                    ));
                }
            } elseif ($payment_status === 'failed' || $payment_status === 'failure') {
                // Handle payment failure
                global $wpdb;
                $bookings_table = $wpdb->prefix . 'mwb_bookings';
                
                $update_data = array(
                    'payment_status' => 'failed',
                    'booking_status' => 'cancelled'
                );
                
                if ($payment_id) {
                    $update_data['payment_id'] = $payment_id;
                }
                
                $result = $wpdb->update(
                    $bookings_table,
                    $update_data,
                    array('booking_id' => $booking_id)
                );
                
                if ($result !== false) {
                    // Send failure notification
                    $this->send_payment_failure_notification($booking_id, $failure_reason);
                    
                    return rest_ensure_response(array(
                        'success' => true,
                        'message' => __('Payment failure recorded', 'marine-world-booking'),
                        'booking_status' => 'cancelled',
                        'payment_status' => 'failed'
                    ));
                }
            }
            
            return new WP_Error('payment_confirmation_failed', __('Payment confirmation failed', 'marine-world-booking'), array('status' => 400));
            
        } catch (Exception $e) {
            return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Admin endpoints
     */
    public function get_admin_bookings($request) {
        try {
            $page = (int) $request->get_param('page');
            $per_page = (int) $request->get_param('per_page');
            $offset = ($page - 1) * $per_page;
            
            $filters = array(
                'date_from' => $request->get_param('date_from'),
                'date_to' => $request->get_param('date_to'),
                'location_id' => $request->get_param('location_id'),
                'status' => $request->get_param('status')
            );
            
            $bookings = $this->database->get_bookings($per_page, $offset, $filters);
            
            $formatted_bookings = array_map(function($booking) {
                return array(
                    'id' => (int) $booking->id,
                    'booking_id' => $booking->booking_id,
                    'location_id' => (int) $booking->location_id,
                    'booking_date' => $booking->booking_date,
                    'customer_name' => $booking->customer_name,
                    'customer_email' => $booking->customer_email,
                    'customer_phone' => $booking->customer_phone,
                    'total_tickets' => (int) $booking->general_tickets + (int) $booking->child_tickets + (int) $booking->senior_tickets,
                    'total_amount' => (float) $booking->total_amount,
                    'payment_status' => $booking->payment_status,
                    'booking_status' => $booking->booking_status,
                    'created_at' => $booking->created_at
                );
            }, $bookings);
            
            // Get total count for pagination
            global $wpdb;
            $bookings_table = $wpdb->prefix . 'mwb_bookings';
            $total_count = $wpdb->get_var("SELECT COUNT(*) FROM {$bookings_table}");
            
            return rest_ensure_response(array(
                'bookings' => $formatted_bookings,
                'pagination' => array(
                    'total_count' => (int) $total_count,
                    'total_pages' => ceil($total_count / $per_page),
                    'current_page' => $page,
                    'per_page' => $per_page
                )
            ));
            
        } catch (Exception $e) {
            return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    public function get_admin_stats($request) {
        try {
            $location_id = $request->get_param('location_id');
            $date_from = $request->get_param('date_from');
            $date_to = $request->get_param('date_to');
            
            $stats = $this->database->get_booking_stats($location_id, $date_from, $date_to);
            
            return rest_ensure_response(array(
                'total_bookings' => (int) ($stats->total_bookings ?? 0),
                'total_revenue' => (float) ($stats->total_revenue ?? 0),
                'total_tickets' => (int) ($stats->total_tickets ?? 0),
                'average_booking_value' => (float) ($stats->average_booking_value ?? 0),
                'unique_customers' => (int) ($stats->unique_customers ?? 0),
                'currency' => get_option('mwb_currency', '₹')
            ));
            
        } catch (Exception $e) {
            return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Helper methods
     */
    public function validate_date($param) {
        return !empty($param) && (bool) strtotime($param);
    }
    
    public function check_admin_permission() {
        return current_user_can('manage_options');
    }
    
    private function send_booking_confirmations($booking_id) {
        $booking = $this->database->get_booking($booking_id);
        
        if ($booking && class_exists('MWB_Notification_Manager')) {
            $notification_manager = new MWB_Notification_Manager();
            $notification_manager->send_booking_confirmation($booking);
        }
    }
    
    private function send_payment_failure_notification($booking_id, $failure_reason = '') {
        $booking = $this->database->get_booking($booking_id);
        
        if ($booking) {
            // Log the failure
            error_log("Payment failed for booking {$booking_id}: {$failure_reason}");
            
            // Send notification if notification manager exists
            if (class_exists('MWB_Notification_Manager')) {
                $notification_manager = new MWB_Notification_Manager();
                // You can implement send_payment_failure method in notification manager if needed
                // $notification_manager->send_payment_failure($booking, $failure_reason);
            }
        }
    }

    /**
 * Get current ticket prices based on date and seasonal pricing
 */
public function get_current_ticket_prices($booking_date = null) {
    // Check cache first
    $cache_key = 'mwb_current_ticket_prices_' . ($booking_date ?: date('Y-m-d'));
    $cached_prices = wp_cache_get($cache_key);
    
    if ($cached_prices !== false) {
        return $cached_prices;
    }
    
    // Get base prices from options
    $default_prices = array(
        'general' => 400,
        'child' => 280,
        'senior' => 350
    );
    
    $base_prices = get_option('mwb_ticket_prices', $default_prices);

    // Ensure prices are numeric
    $base_prices = array_map('floatval', $base_prices);
    
    // Check if dynamic pricing is enabled
    $dynamic_pricing_enabled = get_option('mwb_dynamic_pricing_enabled', false);
    
    if (!$dynamic_pricing_enabled || !$booking_date) {
        wp_cache_set($cache_key, $base_prices, '', 3600); // Cache for 1 hour
        return $base_prices;
    }
    
    // Apply seasonal pricing if active
    $seasonal_pricing = get_option('mwb_seasonal_pricing', array());
    $current_prices = $base_prices;
    
    foreach ($seasonal_pricing as $season) {
        if (!$season['active']) continue;
        
        $start_date = strtotime($season['start_date']);
        $end_date = strtotime($season['end_date']);
        $booking_timestamp = strtotime($booking_date);
        
        if ($booking_timestamp >= $start_date && $booking_timestamp <= $end_date) {
            $multiplier = floatval($season['multiplier']);
            
            foreach ($current_prices as $type => $price) {
                $current_prices[$type] = round($price * $multiplier, 2);
            }
            break; // Apply first matching season
        }
    }
    
    wp_cache_set($cache_key, $current_prices, '', 3600); // Cache for 1 hour
    return $current_prices;
}

/**
 * Check if seasonal pricing is currently active
 */
private function is_seasonal_pricing_active($booking_date = null) {
    if (!$booking_date) return false;
    
    $seasonal_pricing = get_option('mwb_seasonal_pricing', array());
    $booking_timestamp = strtotime($booking_date);
    
    foreach ($seasonal_pricing as $season) {
        if (!$season['active']) continue;
        
        $start_date = strtotime($season['start_date']);
        $end_date = strtotime($season['end_date']);
        
        if ($booking_timestamp >= $start_date && $booking_timestamp <= $end_date) {
            return true;
        }
    }
    
    return false;
}


/**
 * Get current pricing for frontend
 */
public function get_current_pricing($request) {
    $date = $request->get_param('date') ?: date('Y-m-d');
    $prices = $this->get_current_ticket_prices($date);
    
    return rest_ensure_response(array(
        'prices' => $prices,
        'currency' => get_option('mwb_currency', '₹'),
        'date' => $date,
        'is_seasonal' => $this->is_seasonal_pricing_active($date),
        'birthday_discount_rate' => get_option('mwb_birthday_discount_rate', 10)
    ));
}

/**
 * Get birthday offers (public endpoint)
 */
public function get_birthday_offers($request) {
    try {
        $offers = $this->database->get_birthday_offers();
        
        // Filter only active offers for public endpoint
        $active_offers = array_filter($offers, function($offer) {
            return $offer->status === 'active';
        });
        
        $formatted_offers = array_map(function($offer) {
            return array(
                'id' => (int) $offer->id,
                'title' => $offer->title,
                'description' => $offer->description,
                'discount_type' => $offer->discount_type,
                'discount_value' => (float) $offer->discount_value,
                'applicable_tickets' => json_decode($offer->applicable_tickets, true) ?: array(),
                'min_age_requirement' => (int) $offer->min_age_requirement,
                'max_age_requirement' => $offer->max_age_requirement ? (int) $offer->max_age_requirement : null,
                'usage_limit_per_booking' => (int) $offer->usage_limit_per_booking,
                'terms_conditions' => $offer->terms_conditions
            );
        }, $active_offers);
        
        return rest_ensure_response(array_values($formatted_offers));
        
    } catch (Exception $e) {
        return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
    }
}

/**
 * Get single birthday offer (public endpoint)
 */
public function get_birthday_offer($request) {
    try {
        $id = $request->get_param('id');
        $offer = $this->database->get_birthday_offer($id);
        
        if (!$offer || $offer->status !== 'active') {
            return new WP_Error('not_found', 'Birthday offer not found', array('status' => 404));
        }
        
        $formatted_offer = array(
            'id' => (int) $offer->id,
            'title' => $offer->title,
            'description' => $offer->description,
            'discount_type' => $offer->discount_type,
            'discount_value' => (float) $offer->discount_value,
            'applicable_tickets' => json_decode($offer->applicable_tickets, true) ?: array(),
            'min_age_requirement' => (int) $offer->min_age_requirement,
            'max_age_requirement' => $offer->max_age_requirement ? (int) $offer->max_age_requirement : null,
            'usage_limit_per_booking' => (int) $offer->usage_limit_per_booking,
            'terms_conditions' => $offer->terms_conditions
        );
        
        return rest_ensure_response($formatted_offer);
        
    } catch (Exception $e) {
        return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
    }
}

/**
 * Validate birthday offer
 */
public function validate_birthday_offer($request) {
    try {
        $offer_id = $request->get_param('offer_id');
        $name = sanitize_text_field($request->get_param('name'));
        $dob = sanitize_text_field($request->get_param('dob'));
        $booking_date = sanitize_text_field($request->get_param('booking_date'));
        
        $result = $this->database->validate_birthday_offer($offer_id, array(
            'name' => $name,
            'dob' => $dob,
            'booking_date' => $booking_date
        ));
        
        if ($result === true) {
            return rest_ensure_response(array(
                'valid' => true,
                'message' => 'Birthday offer is valid'
            ));
        } else {
            return new WP_Error('validation_failed', $result, array('status' => 400));
        }
        
    } catch (Exception $e) {
        return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
    }
}

/**
 * Get birthday offers for admin (includes all offers)
 */
public function get_admin_birthday_offers($request) {
    try {
        $offers = $this->database->get_birthday_offers();
        
        $formatted_offers = array_map(function($offer) {
            return array(
                'id' => (int) $offer->id,
                'title' => $offer->title,
                'description' => $offer->description,
                'discount_type' => $offer->discount_type,
                'discount_value' => (float) $offer->discount_value,
                'applicable_tickets' => json_decode($offer->applicable_tickets, true) ?: array(),
                'valid_from' => $offer->valid_from,
                'valid_until' => $offer->valid_until,
                'min_age_requirement' => (int) $offer->min_age_requirement,
                'max_age_requirement' => $offer->max_age_requirement ? (int) $offer->max_age_requirement : null,
                'days_before_birthday' => (int) $offer->days_before_birthday,
                'days_after_birthday' => (int) $offer->days_after_birthday,
                'usage_limit_total' => $offer->usage_limit_total ? (int) $offer->usage_limit_total : null,
                'usage_limit_per_booking' => (int) $offer->usage_limit_per_booking,
                'usage_count' => (int) $offer->usage_count,
                'terms_conditions' => $offer->terms_conditions,
                'status' => $offer->status,
                'created_at' => $offer->created_at,
                'updated_at' => $offer->updated_at
            );
        }, $offers);
        
        return rest_ensure_response($formatted_offers);
        
    } catch (Exception $e) {
        return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
    }
}

/**
 * Save birthday offer (create/update)
 */
public function save_birthday_offer($request) {
    try {
        $data = array(
            'title' => sanitize_text_field($request->get_param('title')),
            'description' => sanitize_textarea_field($request->get_param('description')),
            'discount_type' => sanitize_text_field($request->get_param('discount_type')),
            'discount_value' => floatval($request->get_param('discount_value')),
            'applicable_tickets' => $request->get_param('applicable_tickets') ?: array(),
            'valid_from' => sanitize_text_field($request->get_param('valid_from')),
            'valid_until' => sanitize_text_field($request->get_param('valid_until')),
            'min_age_requirement' => intval($request->get_param('min_age_requirement')),
            'max_age_requirement' => $request->get_param('max_age_requirement') ? intval($request->get_param('max_age_requirement')) : null,
            'days_before_birthday' => intval($request->get_param('days_before_birthday')) ?: 7,
            'days_after_birthday' => intval($request->get_param('days_after_birthday')) ?: 7,
            'usage_limit_total' => $request->get_param('usage_limit_total') ? intval($request->get_param('usage_limit_total')) : null,
            'usage_limit_per_booking' => intval($request->get_param('usage_limit_per_booking')) ?: 1,
            'terms_conditions' => sanitize_textarea_field($request->get_param('terms_conditions')),
            'status' => sanitize_text_field($request->get_param('status')) ?: 'active'
        );
        
        $result = $this->database->save_birthday_offer($data);
        
        if ($result) {
            return rest_ensure_response(array(
                'success' => true,
                'id' => $result,
                'message' => 'Birthday offer saved successfully'
            ));
        } else {
            return new WP_Error('save_failed', 'Failed to save birthday offer', array('status' => 500));
        }
        
    } catch (Exception $e) {
        return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
    }
}

/**
 * Update birthday offer
 */
public function update_birthday_offer($request) {
    try {
        $id = $request->get_param('id');
        $data = array(
            'id' => $id,
            'title' => sanitize_text_field($request->get_param('title')),
            'description' => sanitize_textarea_field($request->get_param('description')),
            'discount_type' => sanitize_text_field($request->get_param('discount_type')),
            'discount_value' => floatval($request->get_param('discount_value')),
            'applicable_tickets' => $request->get_param('applicable_tickets') ?: array(),
            'valid_from' => sanitize_text_field($request->get_param('valid_from')),
            'valid_until' => sanitize_text_field($request->get_param('valid_until')),
            'min_age_requirement' => intval($request->get_param('min_age_requirement')),
            'max_age_requirement' => $request->get_param('max_age_requirement') ? intval($request->get_param('max_age_requirement')) : null,
            'days_before_birthday' => intval($request->get_param('days_before_birthday')) ?: 7,
            'days_after_birthday' => intval($request->get_param('days_after_birthday')) ?: 7,
            'usage_limit_total' => $request->get_param('usage_limit_total') ? intval($request->get_param('usage_limit_total')) : null,
            'usage_limit_per_booking' => intval($request->get_param('usage_limit_per_booking')) ?: 1,
            'terms_conditions' => sanitize_textarea_field($request->get_param('terms_conditions')),
            'status' => sanitize_text_field($request->get_param('status')) ?: 'active'
        );
        
        $result = $this->database->save_birthday_offer($data);
        
        if ($result) {
            return rest_ensure_response(array(
                'success' => true,
                'message' => 'Birthday offer updated successfully'
            ));
        } else {
            return new WP_Error('update_failed', 'Failed to update birthday offer', array('status' => 500));
        }
        
    } catch (Exception $e) {
        return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
    }
}

/**
 * Delete birthday offer
 */
public function delete_birthday_offer($request) {
    try {
        $id = $request->get_param('id');
        $result = $this->database->delete_birthday_offer($id);
        
        if ($result) {
            return rest_ensure_response(array(
                'success' => true,
                'message' => 'Birthday offer deleted successfully'
            ));
        } else {
            return new WP_Error('delete_failed', 'Failed to delete birthday offer', array('status' => 500));
        }
        
    } catch (Exception $e) {
        return new WP_Error('api_error', $e->getMessage(), array('status' => 500));
    }
}

}
