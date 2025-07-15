<?php
/**
 * Marine World Booking Database Class
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class MWB_Database {
    
    private $wpdb;
    private $bookings_table;
    private $availability_table;
    private $locations_table;
    private $addons_table;
    private $promo_codes_table;
    private $payment_log_table;
    private $booking_activity_table;
    private $birthday_offers_table;
    
    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->bookings_table = $wpdb->prefix . 'mwb_bookings';
        $this->availability_table = $wpdb->prefix . 'mwb_availability';
        $this->locations_table = $wpdb->prefix . 'mwb_locations';
        $this->addons_table = $wpdb->prefix . 'mwb_addons';
        $this->promo_codes_table = $wpdb->prefix . 'mwb_promo_codes';
        $this->payment_log_table = $wpdb->prefix . 'mwb_payment_log';
        $this->booking_activity_table = $wpdb->prefix . 'mwb_booking_activity';
        $this->birthday_offers_table = $wpdb->prefix . 'mwb_birthday_offers';
    }
    
    /**
     * Initialize database
     */
    public function init() {
        if (!$this->tables_exist()) {
            $this->create_tables();
            $this->insert_default_data();
        } else {
            $this->upgrade_tables();
        }
    }
    
    /**
     * Check if tables exist
     */
    private function tables_exist() {
        $table_name = $this->bookings_table;
        return $this->wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
    }
    
    /**
     * Create database tables
     */
    public function create_tables() {
        $charset_collate = $this->wpdb->get_charset_collate();
        
        // Bookings table
        $sql_bookings = "CREATE TABLE $this->bookings_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            booking_id varchar(50) NOT NULL UNIQUE,
            location_id bigint(20) NOT NULL,
            booking_date date NOT NULL,
            customer_name varchar(255) NOT NULL,
            customer_email varchar(255) NOT NULL,
            customer_phone varchar(20) NOT NULL,
            customer_pincode varchar(10) NOT NULL,
            third_party_booking tinyint(1) DEFAULT 0,
            third_party_name varchar(255) DEFAULT NULL,
            third_party_email varchar(255) DEFAULT NULL,
            third_party_phone varchar(20) DEFAULT NULL,
            general_tickets int(5) DEFAULT 0,
            child_tickets int(5) DEFAULT 0,
            senior_tickets int(5) DEFAULT 0,
            addons_data text,
            subtotal decimal(10,2) NOT NULL,
            discount_amount decimal(10,2) DEFAULT 0,
            discount_type varchar(50) DEFAULT NULL,
            promo_code varchar(50) DEFAULT NULL,
            birthday_offer_id bigint(20) DEFAULT NULL,
            birthday_discount decimal(10,2) DEFAULT 0,
            birthday_person_name varchar(255) DEFAULT NULL,
            birthday_person_dob date DEFAULT NULL,
            total_amount decimal(10,2) NOT NULL,
            payment_status varchar(20) DEFAULT 'pending',
            payment_id varchar(100) DEFAULT NULL,
            payment_method varchar(50) DEFAULT NULL,
            booking_status varchar(20) DEFAULT 'pending',
            qr_code varchar(255) DEFAULT NULL,
            tickets_claimed tinyint(1) DEFAULT 0,
            claimed_at timestamp NULL,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_booking_id (booking_id),
            KEY idx_location_date (location_id, booking_date),
            KEY idx_customer_email (customer_email),
            KEY idx_booking_date (booking_date),
            KEY idx_payment_status (payment_status),
            KEY idx_booking_status (booking_status)
        ) $charset_collate;";
        
        // Availability table
        $sql_availability = "CREATE TABLE $this->availability_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            location_id bigint(20) NOT NULL,
            availability_date date NOT NULL,
            total_capacity int(10) NOT NULL DEFAULT 1000,
            booked_slots int(10) NOT NULL DEFAULT 0,
            available_slots int(10) NOT NULL DEFAULT 1000,
            status varchar(20) DEFAULT 'available',
            special_pricing decimal(10,2) DEFAULT NULL,
            is_blackout tinyint(1) DEFAULT 0,
            notes text,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_location_date (location_id, availability_date),
            KEY idx_location_id (location_id),
            KEY idx_availability_date (availability_date),
            KEY idx_status (status)
        ) $charset_collate;";
        
        // Locations table
        $sql_locations = "CREATE TABLE $this->locations_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            address text,
            city varchar(100),
            state varchar(100),
            pincode varchar(10),
            phone varchar(20),
            email varchar(255),
            timings text,
            facilities text,
            status varchar(20) DEFAULT 'active',
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_status (status)
        ) $charset_collate;";
        
        // Add-ons table
        $sql_addons = "CREATE TABLE $this->addons_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            description text,
            price decimal(10,2) NOT NULL,
            image_url varchar(500) DEFAULT NULL,
            status varchar(20) DEFAULT 'active',
            display_order int(5) DEFAULT 0,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_status (status),
            KEY idx_display_order (display_order)
        ) $charset_collate;";
        
        // Promo codes table
        $sql_promo_codes = "CREATE TABLE $this->promo_codes_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            code varchar(50) NOT NULL UNIQUE,
            description text,
            discount_type varchar(20) NOT NULL,
            discount_value decimal(10,2) NOT NULL,
            minimum_amount decimal(10,2) DEFAULT 0,
            maximum_discount decimal(10,2) DEFAULT NULL,
            usage_limit int(10) DEFAULT NULL,
            used_count int(10) DEFAULT 0,
            valid_from date NOT NULL,
            valid_until date NOT NULL,
            status varchar(20) DEFAULT 'active',
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_code (code),
            KEY idx_status (status),
            KEY idx_valid_dates (valid_from, valid_until)
        ) $charset_collate;";
        
        // Payment log table
        $sql_payment_log = "CREATE TABLE $this->payment_log_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            booking_id varchar(50) NOT NULL,
            payment_id varchar(100) DEFAULT NULL,
            status varchar(20) NOT NULL,
            amount decimal(10,2) DEFAULT NULL,
            gateway_response text,
            ip_address varchar(45) DEFAULT NULL,
            user_agent text,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_booking_id (booking_id),
            KEY idx_payment_id (payment_id),
            KEY idx_status (status)
        ) $charset_collate;";
        
        // Booking activity table
        $sql_booking_activity = "CREATE TABLE $this->booking_activity_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            booking_id varchar(50) NOT NULL,
            action varchar(50) NOT NULL,
            description text,
            user_id bigint(20) DEFAULT NULL,
            ip_address varchar(45) DEFAULT NULL,
            user_agent text,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_booking_id (booking_id),
            KEY idx_action (action),
            KEY idx_created_at (created_at)
        ) $charset_collate;";
        
        // Birthday offers table
        $sql_birthday_offers = "CREATE TABLE $this->birthday_offers_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            title varchar(255) NOT NULL,
            description text,
            discount_type varchar(20) NOT NULL,
            discount_value decimal(10,2) NOT NULL,
            applicable_tickets text,
            minimum_tickets int(5) DEFAULT 1,
            maximum_discount decimal(10,2) DEFAULT NULL,
            requires_id_proof tinyint(1) DEFAULT 1,
            valid_days_before int(3) DEFAULT 7,
            valid_days_after int(3) DEFAULT 7,
            age_limit_min int(3) DEFAULT NULL,
            age_limit_max int(3) DEFAULT NULL,
            usage_limit_per_customer int(3) DEFAULT 1,
            total_usage_limit int(10) DEFAULT NULL,
            used_count int(10) DEFAULT 0,
            status varchar(20) DEFAULT 'active',
            terms_conditions text,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_status (status)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_bookings);
        dbDelta($sql_availability);
        dbDelta($sql_locations);
        dbDelta($sql_addons);
        dbDelta($sql_promo_codes);
        dbDelta($sql_payment_log);
        dbDelta($sql_booking_activity);
        dbDelta($sql_birthday_offers);
    }
    
    /**
     * Upgrade existing tables
     */
    public function upgrade_tables() {
        // Check if image_url column exists in addons table
        $column_exists = $this->wpdb->get_results(
            "SHOW COLUMNS FROM {$this->addons_table} LIKE 'image_url'"
        );
        
        if (empty($column_exists)) {
            // Add image_url column to addons table
            $this->wpdb->query(
                "ALTER TABLE {$this->addons_table} 
                 ADD COLUMN image_url varchar(500) DEFAULT NULL 
                 AFTER price"
            );
        }

        // Check if offer_duration_type column exists in birthday_offers table
        $duration_column_exists = $this->wpdb->get_results(
            "SHOW COLUMNS FROM {$this->birthday_offers_table} LIKE 'offer_duration_type'"
        );
        
        if (empty($duration_column_exists)) {
            // Add offer_duration_type column to birthday_offers table
            $this->wpdb->query(
                "ALTER TABLE {$this->birthday_offers_table} 
                 ADD COLUMN offer_duration_type varchar(20) DEFAULT 'long_term' 
                 AFTER discount_value"
            );
        }

        // Check if valid_from and valid_until columns exist in birthday_offers table
        $valid_from_exists = $this->wpdb->get_results(
            "SHOW COLUMNS FROM {$this->birthday_offers_table} LIKE 'valid_from'"
        );
        
        if (empty($valid_from_exists)) {
            // Add validity date columns to birthday_offers table
            $this->wpdb->query(
                "ALTER TABLE {$this->birthday_offers_table} 
                 ADD COLUMN valid_from date DEFAULT NULL AFTER offer_duration_type,
                 ADD COLUMN valid_until date DEFAULT NULL AFTER valid_from"
            );
        }
    }
    
    /**
     * Insert default data
     */
    public function insert_default_data() {
        // Insert default location
        $location_exists = $this->wpdb->get_var("SELECT COUNT(*) FROM $this->locations_table");
        
        if ($location_exists == 0) {
            $this->wpdb->insert(
                $this->locations_table,
                array(
                    'name' => 'Marine World Kochi',
                    'address' => 'Marine Drive, Kochi',
                    'city' => 'Kochi',
                    'state' => 'Kerala',
                    'pincode' => '682001',
                    'phone' => '+91-9999999999',
                    'email' => 'info@marineworld.in',
                    'timings' => json_encode(array(
                        'monday' => '9:00 AM - 6:00 PM',
                        'tuesday' => '9:00 AM - 6:00 PM',
                        'wednesday' => '9:00 AM - 6:00 PM',
                        'thursday' => '9:00 AM - 6:00 PM',
                        'friday' => '9:00 AM - 6:00 PM',
                        'saturday' => '9:00 AM - 7:00 PM',
                        'sunday' => '9:00 AM - 7:00 PM'
                    )),
                    'facilities' => json_encode(array(
                        'Parking', 'Restrooms', 'Food Court', 'Gift Shop', 'First Aid', 'WiFi'
                    )),
                    'status' => 'active'
                )
            );
        }
        
        // Insert default add-ons
        $addons_exist = $this->wpdb->get_var("SELECT COUNT(*) FROM $this->addons_table");
        
        if ($addons_exist == 0) {
            $addons = array(
                array(
                    'name' => 'Horror House 16D',
                    'description' => 'Experience the ultimate thrill with our 16D horror house attraction',
                    'price' => 120,
                    'display_order' => 1
                ),
                array(
                    'name' => 'Mirror Maze',
                    'description' => 'Navigate through our challenging mirror maze',
                    'price' => 120,
                    'display_order' => 2
                ),
                array(
                    'name' => 'Birds Park',
                    'description' => 'Explore our beautiful collection of exotic birds',
                    'price' => 120,
                    'display_order' => 3
                ),
                array(
                    'name' => 'Children\'s Park',
                    'description' => 'Fun-filled activities specially designed for children',
                    'price' => 120,
                    'display_order' => 4
                ),
                array(
                    'name' => 'Train Rides',
                    'description' => 'Exciting train rides around the Marine World',
                    'price' => 120,
                    'display_order' => 5
                )
            );
            
            foreach ($addons as $addon) {
                $this->wpdb->insert(
                    $this->addons_table,
                    array(
                        'name' => $addon['name'],
                        'description' => $addon['description'],
                        'price' => $addon['price'],
                        'status' => 'active',
                        'display_order' => $addon['display_order']
                    )
                );
            }
        }
        
        // Insert sample promo codes
        $promo_exist = $this->wpdb->get_var("SELECT COUNT(*) FROM $this->promo_codes_table");
        
        if ($promo_exist == 0) {
            $this->wpdb->insert(
                $this->promo_codes_table,
                array(
                    'code' => 'WELCOME10',
                    'description' => 'Welcome discount - 10% off on your first booking',
                    'discount_type' => 'percentage',
                    'discount_value' => 10,
                    'minimum_amount' => 500,
                    'maximum_discount' => 200,
                    'usage_limit' => 1000,
                    'valid_from' => date('Y-m-d'),
                    'valid_until' => date('Y-m-d', strtotime('+1 year')),
                    'status' => 'active'
                )
            );
            
            $this->wpdb->insert(
                $this->promo_codes_table,
                array(
                    'code' => 'FAMILY20',
                    'description' => 'Family pack discount - 20% off for 4+ people',
                    'discount_type' => 'percentage',
                    'discount_value' => 20,
                    'minimum_amount' => 1000,
                    'maximum_discount' => 500,
                    'usage_limit' => 500,
                    'valid_from' => date('Y-m-d'),
                    'valid_until' => date('Y-m-d', strtotime('+6 months')),
                    'status' => 'active'
                )
            );
        }
        
        // Insert default birthday offer
        $birthday_offers_exist = $this->wpdb->get_var("SELECT COUNT(*) FROM $this->birthday_offers_table");
        
        if ($birthday_offers_exist == 0) {
            $this->wpdb->insert(
                $this->birthday_offers_table,
                array(
                    'title' => 'Birthday Special Offer',
                    'description' => 'Celebrate your birthday with us! Get special discount on your birthday.',
                    'discount_type' => 'percentage',
                    'discount_value' => 15,
                    'applicable_tickets' => json_encode(['general', 'child', 'senior']),
                    'minimum_tickets' => 1,
                    'maximum_discount' => 300,
                    'requires_id_proof' => 1,
                    'valid_days_before' => 7,
                    'valid_days_after' => 7,
                    'age_limit_min' => NULL,
                    'age_limit_max' => NULL,
                    'usage_limit_per_customer' => 1,
                    'total_usage_limit' => NULL,
                    'status' => 'active',
                    'terms_conditions' => 'Valid ID proof required. Discount applicable on birthday person\'s ticket. Valid 7 days before and after birthday.'
                )
            );
        }
        
        // Generate availability for next 60 days
        $this->generate_availability_data();
    }
    
    /**
     * Generate availability data for upcoming days
     */
    private function generate_availability_data() {
        $location_id = 1; // Default location
        $total_capacity = 1000;
        
        // Check if availability data already exists
        $existing_availability = $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM $this->availability_table WHERE location_id = %d",
                $location_id
            )
        );
        
        if ($existing_availability > 0) {
            return; // Availability data already exists
        }
        
        for ($i = 0; $i < 60; $i++) {
            $date = date('Y-m-d', strtotime("+$i days"));
            
            // Determine status based on day
            $day_of_week = date('w', strtotime($date));
            $available_slots = $total_capacity;
            $status = 'available';
            
            // Weekend pricing and capacity adjustments
            if ($day_of_week == 0 || $day_of_week == 6) { // Sunday or Saturday
                $available_slots = $total_capacity * 0.8; // Reduce weekend capacity
                $status = 'limited';
            }
            
            $this->wpdb->insert(
                $this->availability_table,
                array(
                    'location_id' => $location_id,
                    'availability_date' => $date,
                    'total_capacity' => $total_capacity,
                    'booked_slots' => 0,
                    'available_slots' => $available_slots,
                    'status' => $status,
                    'is_blackout' => 0
                )
            );
        }
    }
    
    /**
     * Booking methods
     */
    public function create_booking($booking_data) {
        $booking_id = $this->generate_booking_id();
        $booking_data['booking_id'] = $booking_id;
        $booking_data['qr_code'] = $this->generate_qr_code($booking_id);
        
        $result = $this->wpdb->insert($this->bookings_table, $booking_data);
        
        if ($result) {
            // Update availability
            $this->update_availability_after_booking($booking_data);
            return $booking_id;
        }
        
        return false;
    }
    
    public function get_booking($booking_id) {
        return $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM $this->bookings_table WHERE booking_id = %s",
                $booking_id
            )
        );
    }
    
    public function update_booking_status($booking_id, $status, $payment_id = null) {
        $update_data = array('booking_status' => $status);
        
        if ($payment_id) {
            $update_data['payment_id'] = $payment_id;
            $update_data['payment_status'] = 'completed';
        }
        
        return $this->wpdb->update(
            $this->bookings_table,
            $update_data,
            array('booking_id' => $booking_id)
        );
    }
    
    public function get_bookings($limit = 50, $offset = 0, $filters = array()) {
        $where = "WHERE 1=1";
        $params = array();
        
        if (!empty($filters['date_from'])) {
            $where .= " AND booking_date >= %s";
            $params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $where .= " AND booking_date <= %s";
            $params[] = $filters['date_to'];
        }
        
        if (!empty($filters['location_id'])) {
            $where .= " AND location_id = %d";
            $params[] = $filters['location_id'];
        }
        
        if (!empty($filters['status'])) {
            $where .= " AND booking_status = %s";
            $params[] = $filters['status'];
        }
        
        $params[] = $limit;
        $params[] = $offset;
        
        return $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM $this->bookings_table 
                 $where 
                 ORDER BY created_at DESC 
                 LIMIT %d OFFSET %d",
                ...$params
            )
        );
    }
    
    /**
     * Availability methods
     */
    public function get_availability($location_id, $date_from, $date_to) {
        return $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM $this->availability_table 
                 WHERE location_id = %d 
                 AND availability_date BETWEEN %s AND %s 
                 ORDER BY availability_date ASC",
                $location_id,
                $date_from,
                $date_to
            )
        );
    }
    
    private function update_availability_after_booking($booking_data) {
        $total_tickets = ($booking_data['general_tickets'] ?? 0) + 
                        ($booking_data['child_tickets'] ?? 0) + 
                        ($booking_data['senior_tickets'] ?? 0);
        
        $this->wpdb->query(
            $this->wpdb->prepare(
                "UPDATE $this->availability_table 
                 SET booked_slots = booked_slots + %d,
                     available_slots = available_slots - %d
                 WHERE location_id = %d AND availability_date = %s",
                $total_tickets,
                $total_tickets,
                $booking_data['location_id'],
                $booking_data['booking_date']
            )
        );
        
        // Update status based on availability
        $this->update_availability_status($booking_data['location_id'], $booking_data['booking_date']);
    }
    
    private function update_availability_status($location_id, $date) {
        $availability = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM $this->availability_table 
                 WHERE location_id = %d AND availability_date = %s",
                $location_id,
                $date
            )
        );
        
        if ($availability) {
            $status = 'available';
            $available_percentage = ($availability->available_slots / $availability->total_capacity) * 100;
            
            if ($available_percentage <= 0) {
                $status = 'sold_out';
            } elseif ($available_percentage <= 20) {
                $status = 'limited';
            }
            
            $this->wpdb->update(
                $this->availability_table,
                array('status' => $status),
                array('location_id' => $location_id, 'availability_date' => $date)
            );
        }
    }
    
    /**
     * Location methods
     */
    public function get_locations($include_inactive = false) {
        $where_clause = $include_inactive ? '' : "WHERE status = 'active'";
        return $this->wpdb->get_results(
            "SELECT * FROM $this->locations_table $where_clause ORDER BY name"
        );
    }
    
    public function get_location($location_id) {
        return $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM $this->locations_table WHERE id = %d",
                $location_id
            )
        );
    }
    
    public function create_location($location_data) {
        $result = $this->wpdb->insert($this->locations_table, $location_data);
        if ($result) {
            return $this->wpdb->insert_id;
        }
        return false;
    }
    
    public function update_location($location_id, $location_data) {
        return $this->wpdb->update(
            $this->locations_table,
            $location_data,
            array('id' => $location_id)
        );
    }
    
    public function delete_location($location_id) {
        // First check if location has bookings
        $booking_count = $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM $this->bookings_table WHERE location_id = %d",
                $location_id
            )
        );
        
        if ($booking_count > 0) {
            return new WP_Error('has_bookings', 'Cannot delete location with existing bookings');
        }
        
        // Delete availability data first
        $this->wpdb->delete($this->availability_table, array('location_id' => $location_id));
        
        // Delete location
        return $this->wpdb->delete($this->locations_table, array('id' => $location_id));
    }
    
    /**
     * Add-ons methods
     */
    public function get_addons($include_inactive = false) {
        $where_clause = $include_inactive ? '' : "WHERE status = 'active'";
        return $this->wpdb->get_results(
            "SELECT * FROM $this->addons_table $where_clause ORDER BY display_order, name"
        );
    }
    
    public function get_addon($addon_id) {
        return $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM $this->addons_table WHERE id = %d",
                $addon_id
            )
        );
    }
    
    public function create_addon($addon_data) {
        // Set display order if not provided
        if (!isset($addon_data['display_order'])) {
            $max_order = $this->wpdb->get_var(
                "SELECT MAX(display_order) FROM $this->addons_table"
            );
            $addon_data['display_order'] = ($max_order ?? 0) + 1;
        }
        
        $result = $this->wpdb->insert($this->addons_table, $addon_data);
        if ($result) {
            return $this->wpdb->insert_id;
        }
        return false;
    }
    
    public function update_addon($addon_id, $addon_data) {
        return $this->wpdb->update(
            $this->addons_table,
            $addon_data,
            array('id' => $addon_id)
        );
    }
    
    public function delete_addon($addon_id) {
        // Check if addon is used in any bookings
        $usage_count = $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM $this->bookings_table 
                 WHERE addons_data LIKE %s",
                '%\"' . $addon_id . '\"%'
            )
        );
        
        if ($usage_count > 0) {
            return new WP_Error('addon_in_use', 'Cannot delete add-on that has been used in bookings');
        }
        
        return $this->wpdb->delete($this->addons_table, array('id' => $addon_id));
    }
    
    public function search_addons($search_term, $status_filter = '') {
        $where = "WHERE (name LIKE %s OR description LIKE %s)";
        $search_wildcard = '%' . $this->wpdb->esc_like($search_term) . '%';
        $params = array($search_wildcard, $search_wildcard);
        
        if (!empty($status_filter)) {
            $where .= " AND status = %s";
            $params[] = $status_filter;
        }
        
        return $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM $this->addons_table 
                 $where 
                 ORDER BY display_order, name",
                ...$params
            )
        );
    }
    
    public function update_addon_order($addon_orders) {
        foreach ($addon_orders as $addon_id => $order) {
            $this->wpdb->update(
                $this->addons_table,
                array('display_order' => intval($order)),
                array('id' => intval($addon_id))
            );
        }
        return true;
    }
    
    public function get_addon_usage_stats($addon_id = null, $date_from = null, $date_to = null) {
        $where = "WHERE booking_status = 'confirmed' AND addons_data IS NOT NULL AND addons_data != ''";
        $params = array();
        
        if ($date_from) {
            $where .= " AND booking_date >= %s";
            $params[] = $date_from;
        }
        
        if ($date_to) {
            $where .= " AND booking_date <= %s";
            $params[] = $date_to;
        }
        
        $bookings = $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT addons_data FROM $this->bookings_table $where",
                ...$params
            )
        );
        
        $addon_stats = array();
        
        foreach ($bookings as $booking) {
            $addons_data = json_decode($booking->addons_data, true);
            if (is_array($addons_data)) {
                foreach ($addons_data as $addon_booking_id => $quantity) {
                    if ($addon_id && $addon_booking_id != $addon_id) continue;
                    
                    if (!isset($addon_stats[$addon_booking_id])) {
                        $addon_stats[$addon_booking_id] = array(
                            'total_bookings' => 0,
                            'total_quantity' => 0
                        );
                    }
                    
                    $addon_stats[$addon_booking_id]['total_bookings']++;
                    $addon_stats[$addon_booking_id]['total_quantity'] += intval($quantity);
                }
            }
        }
        
        return $addon_id ? ($addon_stats[$addon_id] ?? array('total_bookings' => 0, 'total_quantity' => 0)) : $addon_stats;
    }
    
    /**
     * Promo code methods
     */
    public function get_promo_code($code) {
        return $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM $this->promo_codes_table 
                 WHERE code = %s 
                 AND status = 'active' 
                 AND valid_from <= CURDATE() 
                 AND valid_until >= CURDATE()",
                $code
            )
        );
    }
    
    public function use_promo_code($code) {
        $this->wpdb->query(
            $this->wpdb->prepare(
                "UPDATE $this->promo_codes_table 
                 SET used_count = used_count + 1 
                 WHERE code = %s",
                $code
            )
        );
    }
    
    public function get_promo_codes($include_inactive = false) {
        $where_clause = $include_inactive ? '' : "WHERE status = 'active'";
        return $this->wpdb->get_results(
            "SELECT * FROM $this->promo_codes_table $where_clause ORDER BY created_at DESC"
        );
    }
    
    public function get_promo_code_by_id($promo_id) {
        return $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM $this->promo_codes_table WHERE id = %d",
                $promo_id
            )
        );
    }
    
    public function create_promo_code($promo_data) {
        $result = $this->wpdb->insert($this->promo_codes_table, $promo_data);
        if ($result) {
            return $this->wpdb->insert_id;
        }
        return false;
    }
    
    public function update_promo_code($promo_id, $promo_data) {
        return $this->wpdb->update(
            $this->promo_codes_table,
            $promo_data,
            array('id' => $promo_id)
        );
    }
    
    public function delete_promo_code($promo_id) {
        return $this->wpdb->delete($this->promo_codes_table, array('id' => $promo_id));
    }
    
    public function search_promo_codes($search_term, $status_filter = '') {
        $where = "WHERE (code LIKE %s OR description LIKE %s)";
        $search_wildcard = '%' . $this->wpdb->esc_like($search_term) . '%';
        $params = array($search_wildcard, $search_wildcard);
        
        if (!empty($status_filter)) {
            $where .= " AND status = %s";
            $params[] = $status_filter;
        }
        
        // Use call_user_func_array for PHP compatibility instead of spread operator
        $query = "SELECT * FROM $this->promo_codes_table $where ORDER BY created_at DESC";
        return $this->wpdb->get_results(
            call_user_func_array(array($this->wpdb, 'prepare'), array_merge(array($query), $params))
        );
    }
    
    /**
     * Statistics methods
     */
    public function get_booking_stats($location_id = null, $date_from = null, $date_to = null) {
        // Include test bookings when in test mode
        $test_mode = get_option('mwb_icici_test_mode', 'yes') === 'yes';
        
        if ($test_mode) {
            // In test mode, include pending bookings as they represent test bookings
            $where = "WHERE booking_status IN ('confirmed', 'pending') AND booking_status != 'cancelled' AND booking_status != 'expired'";
        } else {
            // In live mode, only count completed bookings
            $where = "WHERE booking_status = 'confirmed' AND payment_status = 'completed'";
        }
        $params = array();
        
        if ($location_id) {
            $where .= " AND location_id = %d";
            $params[] = $location_id;
        }
        
        if ($date_from) {
            $where .= " AND booking_date >= %s";
            $params[] = $date_from;
        }
        
        if ($date_to) {
            $where .= " AND booking_date <= %s";
            $params[] = $date_to;
        }
        
        $result = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT 
                    COUNT(*) as total_bookings,
                    SUM(total_amount) as total_revenue,
                    SUM(general_tickets + child_tickets + senior_tickets) as total_tickets,
                    AVG(total_amount) as average_booking_value,
                    COUNT(DISTINCT customer_email) as unique_customers
                 FROM $this->bookings_table 
                 $where",
                ...$params
            )
        );
        
        return $result;
    }
    
    public function get_daily_booking_stats($date_from, $date_to, $location_id = null) {
        // Include test bookings when in test mode
        $test_mode = get_option('mwb_icici_test_mode', 'yes') === 'yes';
        
        if ($test_mode) {
            // In test mode, include pending bookings as they represent test bookings
            $where = "WHERE booking_status IN ('confirmed', 'pending') AND booking_status != 'cancelled' AND booking_status != 'expired'";
        } else {
            // In live mode, only count completed bookings
            $where = "WHERE booking_status = 'confirmed' AND payment_status = 'completed'";
        }
        $params = array();
        
        if ($location_id) {
            $where .= " AND location_id = %d";
            $params[] = $location_id;
        }
        
        $where .= " AND booking_date BETWEEN %s AND %s";
        $params[] = $date_from;
        $params[] = $date_to;
        
        return $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT 
                    booking_date,
                    COUNT(*) as bookings,
                    SUM(total_amount) as revenue,
                    SUM(general_tickets + child_tickets + senior_tickets) as tickets
                 FROM $this->bookings_table 
                 $where
                 GROUP BY booking_date 
                 ORDER BY booking_date",
                ...$params
            )
        );
    }
    
    /**
     * Helper methods
     */
    private function generate_booking_id() {
        do {
            $booking_id = 'MW' . date('Ymd') . wp_rand(1000, 9999);
            $exists = $this->wpdb->get_var(
                $this->wpdb->prepare(
                    "SELECT COUNT(*) FROM $this->bookings_table WHERE booking_id = %s",
                    $booking_id
                )
            );
        } while ($exists > 0);
        
        return $booking_id;
    }
    
    private function generate_qr_code($booking_id) {
        return 'QR_' . base64_encode($booking_id . '_' . time());
    }
    
    /**
     * Cleanup methods
     */
    public function cleanup_expired_bookings() {
        // Mark expired unpaid bookings
        $expired_bookings = $this->wpdb->get_results(
            "SELECT * FROM $this->bookings_table 
             WHERE payment_status = 'pending' 
             AND booking_status = 'pending'
             AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)"
        );
        
        foreach ($expired_bookings as $booking) {
            // Update booking status
            $this->wpdb->update(
                $this->bookings_table,
                array('booking_status' => 'expired'),
                array('id' => $booking->id)
            );
            
            // Restore availability
            $this->restore_availability($booking);
        }
        
        return count($expired_bookings);
    }
    
    private function restore_availability($booking) {
        $total_tickets = $booking->general_tickets + $booking->child_tickets + $booking->senior_tickets;
        
        $this->wpdb->query(
            $this->wpdb->prepare(
                "UPDATE $this->availability_table 
                 SET booked_slots = booked_slots - %d,
                     available_slots = available_slots + %d
                 WHERE location_id = %d AND availability_date = %s",
                $total_tickets,
                $total_tickets,
                $booking->location_id,
                $booking->booking_date
            )
        );
        
        // Update status
        $this->update_availability_status($booking->location_id, $booking->booking_date);
    }
    
    /**
     * Search methods
     */
    public function search_bookings($search_term, $filters = array()) {
        $where = "WHERE (booking_id LIKE %s OR customer_name LIKE %s OR customer_email LIKE %s OR customer_phone LIKE %s)";
        $search_wildcard = '%' . $this->wpdb->esc_like($search_term) . '%';
        $params = array($search_wildcard, $search_wildcard, $search_wildcard, $search_wildcard);
        
        foreach ($filters as $key => $value) {
            if (empty($value)) continue;
            
            switch ($key) {
                case 'date_from':
                    $where .= " AND booking_date >= %s";
                    $params[] = $value;
                    break;
                case 'date_to':
                    $where .= " AND booking_date <= %s";
                    $params[] = $value;
                    break;
                case 'location_id':
                    $where .= " AND location_id = %d";
                    $params[] = $value;
                    break;
                case 'booking_status':
                    $where .= " AND booking_status = %s";
                    $params[] = $value;
                    break;
            }
        }
        
        return $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM $this->bookings_table 
                 $where 
                 ORDER BY created_at DESC 
                 LIMIT 100",
                ...$params
            )
        );
    }
    
    /**
     * Birthday Offers Management
     */
    public function get_birthday_offers($status = null) {
        $where = "";
        $params = array();
        
        if ($status) {
            $where = "WHERE status = %s";
            $params[] = $status;
        }
        
        $query = "SELECT * FROM $this->birthday_offers_table $where ORDER BY id ASC";
        
        if (!empty($params)) {
            $results = $this->wpdb->get_results(
                $this->wpdb->prepare($query, ...$params)
            );
        } else {
            $results = $this->wpdb->get_results($query);
        }
        
        // Map database field names to frontend field names
        return array_map(array($this, 'map_birthday_offer_fields'), $results);
    }
    
    public function get_birthday_offer($id) {
        $result = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM $this->birthday_offers_table WHERE id = %d",
                $id
            )
        );
        
        if ($result) {
            return $this->map_birthday_offer_fields($result);
        }
        
        return null;
    }
    
    private function map_birthday_offer_fields($offer) {
        if (!$offer) return null;
        
        // Map database field names to frontend field names
        $mapped = array(
            'id' => $offer->id,
            'title' => $offer->title,
            'description' => $offer->description,
            'discount_type' => $offer->discount_type,
            'discount_value' => $offer->discount_value,
            'status' => $offer->status,
            'applicable_tickets' => json_decode($offer->applicable_tickets, true) ?: array(),
            'terms_conditions' => $offer->terms_conditions,
            'created_at' => $offer->created_at,
            'updated_at' => $offer->updated_at
        );
        
        // Add new fields if they exist
        if (isset($offer->offer_duration_type)) {
            $mapped['offer_duration_type'] = $offer->offer_duration_type;
        }
        if (isset($offer->valid_from)) {
            $mapped['valid_from'] = $offer->valid_from;
        }
        if (isset($offer->valid_until)) {
            $mapped['valid_until'] = $offer->valid_until;
        }
        
        // Map field names that differ between database and frontend
        $mapped['min_age_requirement'] = $offer->age_limit_min ?? 1;
        $mapped['max_age_requirement'] = $offer->age_limit_max ?? '';
        $mapped['days_before_birthday'] = $offer->valid_days_before ?? 7;
        $mapped['days_after_birthday'] = $offer->valid_days_after ?? 7;
        $mapped['usage_limit_per_booking'] = $offer->usage_limit_per_customer ?? 1;
        $mapped['usage_limit_total'] = $offer->total_usage_limit ?? '';
        $mapped['usage_count'] = $offer->used_count ?? 0;
        
        return (object) $mapped;
    }
    
    public function save_birthday_offer($data) {
        // Debug logging
        error_log('Birthday offer data received: ' . print_r($data, true));
        
        // First, check if new columns exist and add them if needed
        $this->upgrade_tables();
        
        // Map frontend field names to database field names
        $mapped_data = array();
        
        // Basic fields that definitely exist in original schema
        if (isset($data['title'])) $mapped_data['title'] = sanitize_text_field($data['title']);
        if (isset($data['description'])) $mapped_data['description'] = sanitize_textarea_field($data['description']);
        if (isset($data['discount_type'])) $mapped_data['discount_type'] = sanitize_text_field($data['discount_type']);
        if (isset($data['discount_value'])) $mapped_data['discount_value'] = floatval($data['discount_value']);
        if (isset($data['status'])) $mapped_data['status'] = sanitize_text_field($data['status']);
        if (isset($data['terms_conditions'])) $mapped_data['terms_conditions'] = sanitize_textarea_field($data['terms_conditions']);
        
        // Handle applicable tickets - ensure it's JSON
        if (isset($data['applicable_tickets'])) {
            if (is_array($data['applicable_tickets'])) {
                $mapped_data['applicable_tickets'] = json_encode($data['applicable_tickets']);
            } else {
                $mapped_data['applicable_tickets'] = sanitize_text_field($data['applicable_tickets']);
            }
        } else {
            // Default to all ticket types
            $mapped_data['applicable_tickets'] = json_encode(array('general', 'child', 'senior'));
        }
        
        // Map field names that exist in original schema
        if (isset($data['min_age_requirement'])) $mapped_data['age_limit_min'] = intval($data['min_age_requirement']);
        if (isset($data['max_age_requirement']) && !empty($data['max_age_requirement'])) {
            $mapped_data['age_limit_max'] = intval($data['max_age_requirement']);
        }
        
        if (isset($data['days_before_birthday'])) $mapped_data['valid_days_before'] = intval($data['days_before_birthday']);
        if (isset($data['days_after_birthday'])) $mapped_data['valid_days_after'] = intval($data['days_after_birthday']);
        
        if (isset($data['usage_limit_per_booking'])) $mapped_data['usage_limit_per_customer'] = intval($data['usage_limit_per_booking']);
        if (isset($data['usage_limit_total']) && !empty($data['usage_limit_total'])) {
            $mapped_data['total_usage_limit'] = intval($data['usage_limit_total']);
        }
        
        // Set defaults for required fields from original schema
        if (!isset($mapped_data['status'])) $mapped_data['status'] = 'active';
        if (!isset($mapped_data['valid_days_before'])) $mapped_data['valid_days_before'] = 7;
        if (!isset($mapped_data['valid_days_after'])) $mapped_data['valid_days_after'] = 7;
        if (!isset($mapped_data['usage_limit_per_customer'])) $mapped_data['usage_limit_per_customer'] = 1;
        if (!isset($mapped_data['age_limit_min'])) $mapped_data['age_limit_min'] = 1;
        
        // Set fields that exist in original schema but not used by our form
        if (!isset($mapped_data['minimum_tickets'])) $mapped_data['minimum_tickets'] = 1;
        if (!isset($mapped_data['requires_id_proof'])) $mapped_data['requires_id_proof'] = 0; // Default to not required
        if (!isset($mapped_data['used_count'])) $mapped_data['used_count'] = 0;
        
        // Check if new columns exist before adding them
        $columns = $this->wpdb->get_col("DESCRIBE {$this->birthday_offers_table}", 0);
        
        if (in_array('offer_duration_type', $columns) && isset($data['offer_duration_type'])) {
            $mapped_data['offer_duration_type'] = sanitize_text_field($data['offer_duration_type']);
        }
        
        if (in_array('valid_from', $columns) && isset($data['valid_from']) && !empty($data['valid_from'])) {
            $mapped_data['valid_from'] = sanitize_text_field($data['valid_from']);
        }
        
        if (in_array('valid_until', $columns) && isset($data['valid_until']) && !empty($data['valid_until'])) {
            $mapped_data['valid_until'] = sanitize_text_field($data['valid_until']);
        }
        
        error_log('Mapped data for database: ' . print_r($mapped_data, true));
        error_log('Available columns: ' . print_r($columns, true));
        
        if (isset($data['id']) && !empty($data['id'])) {
            // Update existing offer
            $id = intval($data['id']);
            
            $result = $this->wpdb->update(
                $this->birthday_offers_table,
                $mapped_data,
                array('id' => $id)
            );
            
            if ($result === false) {
                error_log('Database update error: ' . $this->wpdb->last_error);
                error_log('Update query: ' . $this->wpdb->last_query);
                return false;
            }
            
            return $id;
        } else {
            // Insert new offer
            $result = $this->wpdb->insert(
                $this->birthday_offers_table,
                $mapped_data
            );
            
            if ($result === false) {
                error_log('Database insert error: ' . $this->wpdb->last_error);
                error_log('Insert query: ' . $this->wpdb->last_query);
                return false;
            }
            
            return $this->wpdb->insert_id;
        }
    }
    
    public function delete_birthday_offer($id) {
        return $this->wpdb->delete(
            $this->birthday_offers_table,
            array('id' => $id)
        );
    }
    
    public function validate_birthday_offer($offer_id, $birthday_date, $customer_email = null) {
        $offer = $this->get_birthday_offer($offer_id);
        
        if (!$offer || $offer->status !== 'active') {
            return array('valid' => false, 'message' => 'Invalid or inactive offer');
        }
        
        // Check if birthday is within valid range
        $birthday = new DateTime($birthday_date);
        $today = new DateTime();
        
        $days_diff = $today->diff($birthday)->days;
        $is_future = $today < $birthday;
        
        $valid_before = $offer->valid_days_before;
        $valid_after = $offer->valid_days_after;
        
        if ($is_future && $days_diff > $valid_before) {
            return array('valid' => false, 'message' => "Birthday offer is valid only {$valid_before} days before birthday");
        }
        
        if (!$is_future && $days_diff > $valid_after) {
            return array('valid' => false, 'message' => "Birthday offer is valid only {$valid_after} days after birthday");
        }
        
        // Check usage limits if customer email provided
        if ($customer_email && $offer->usage_limit_per_customer) {
            $usage_count = $this->wpdb->get_var(
                $this->wpdb->prepare(
                    "SELECT COUNT(*) FROM $this->bookings_table 
                     WHERE customer_email = %s AND birthday_offer_id = %d",
                    $customer_email,
                    $offer_id
                )
            );
            
            if ($usage_count >= $offer->usage_limit_per_customer) {
                return array('valid' => false, 'message' => 'You have already used this birthday offer');
            }
        }
        
        // Check total usage limit
        if ($offer->total_usage_limit && $offer->used_count >= $offer->total_usage_limit) {
            return array('valid' => false, 'message' => 'Birthday offer usage limit reached');
        }
        
        return array('valid' => true, 'offer' => $offer);
    }
}
