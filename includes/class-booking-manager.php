<?php

class MWB_Booking_Manager {
    
    private $database;
    private $notification_manager;
    
    public function __construct() {
        $this->database = new MWB_Database();
        $this->notification_manager = new MWB_Notification_Manager();
        
        $this->init_hooks();
    }
    
    private function init_hooks() {
        // Admin actions
        add_action('wp_ajax_mwb_claim_tickets', array($this, 'claim_tickets'));
        add_action('wp_ajax_mwb_cancel_booking', array($this, 'cancel_booking'));
        add_action('wp_ajax_mwb_resend_confirmation', array($this, 'resend_confirmation'));
        
        // Scheduled tasks
        add_action('mwb_cleanup_expired_bookings', array($this, 'cleanup_expired_bookings'));
        add_action('mwb_update_availability_status', array($this, 'update_availability_status'));
        
        // Schedule hooks if not already scheduled
        if (!wp_next_scheduled('mwb_cleanup_expired_bookings')) {
            wp_schedule_event(time(), 'hourly', 'mwb_cleanup_expired_bookings');
        }
        
        if (!wp_next_scheduled('mwb_update_availability_status')) {
            wp_schedule_event(time(), 'twicedaily', 'mwb_update_availability_status');
        }
    }
    
    public function create_booking($booking_data) {
        // Validate booking data
        $validation_result = $this->validate_booking_data($booking_data);
        if (is_wp_error($validation_result)) {
            return $validation_result;
        }
        
        // Check availability
        $availability_check = $this->check_availability(
            $booking_data['location_id'],
            $booking_data['booking_date'],
            $this->get_total_tickets($booking_data)
        );
        
        if (is_wp_error($availability_check)) {
            return $availability_check;
        }
        
        // Create booking in database
        $booking_id = $this->database->create_booking($booking_data);
        
        if (!$booking_id) {
            return new WP_Error('booking_creation_failed', 'Failed to create booking');
        }
        
        // Log booking creation
        $this->log_booking_activity($booking_id, 'created', 'Booking created');
        
        return $booking_id;
    }
    
    private function validate_booking_data($data) {
        $required_fields = array(
            'location_id',
            'booking_date',
            'customer_name',
            'customer_email',
            'customer_phone',
            'customer_pincode'
        );
        
        foreach ($required_fields as $field) {
            if (empty($data[$field])) {
                return new WP_Error('missing_field', "Required field missing: {$field}");
            }
        }
        
        // Validate email
        if (!is_email($data['customer_email'])) {
            return new WP_Error('invalid_email', 'Invalid email address');
        }
        
        // Validate phone
        if (!preg_match('/^[+]?[\d\s\-\(\)]{10,15}$/', $data['customer_phone'])) {
            return new WP_Error('invalid_phone', 'Invalid phone number');
        }
        
        // Validate date
        $booking_date = strtotime($data['booking_date']);
        $today = strtotime('today');
        $max_advance = strtotime('+60 days');
        
        if ($booking_date < $today) {
            return new WP_Error('invalid_date', 'Cannot book for past dates');
        }
        
        if ($booking_date > $max_advance) {
            return new WP_Error('invalid_date', 'Cannot book more than 60 days in advance');
        }
        
        // Validate tickets
        $total_tickets = $this->get_total_tickets($data);
        if ($total_tickets <= 0) {
            return new WP_Error('no_tickets', 'At least one ticket must be selected');
        }
        
        if ($total_tickets > 50) {
            return new WP_Error('too_many_tickets', 'Maximum 50 tickets per booking');
        }
        
        return true;
    }
    
    private function get_total_tickets($data) {
        return ($data['general_tickets'] ?? 0) + 
               ($data['child_tickets'] ?? 0) + 
               ($data['senior_tickets'] ?? 0);
    }
    
    private function check_availability($location_id, $date, $requested_tickets) {
        $availability = $this->database->get_availability($location_id, $date, $date);
        
        if (empty($availability)) {
            return new WP_Error('no_availability_data', 'No availability data found for this date');
        }
        
        $day_availability = $availability[0];
        
        if ($day_availability->is_blackout) {
            return new WP_Error('blackout_date', 'Selected date is not available');
        }
        
        if ($day_availability->status === 'sold_out') {
            return new WP_Error('sold_out', 'Selected date is sold out');
        }
        
        if ($day_availability->available_slots < $requested_tickets) {
            return new WP_Error('insufficient_availability', 
                "Only {$day_availability->available_slots} tickets available");
        }
        
        return true;
    }
    
    public function claim_tickets() {
        check_ajax_referer('mwb_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $booking_id = sanitize_text_field($_POST['booking_id']);
        
        if (empty($booking_id)) {
            wp_send_json_error('Booking ID is required');
        }
        
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking) {
            wp_send_json_error('Booking not found');
        }
        
        if ($booking->tickets_claimed) {
            wp_send_json_error('Tickets already claimed');
        }
        
        if ($booking->booking_status !== 'confirmed') {
            wp_send_json_error('Booking is not confirmed');
        }
        
        // Update booking as claimed
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $result = $wpdb->update(
            $bookings_table,
            array(
                'tickets_claimed' => 1,
                'claimed_at' => current_time('mysql')
            ),
            array('booking_id' => $booking_id)
        );
        
        if ($result === false) {
            wp_send_json_error('Failed to update booking');
        }
        
        // Log activity
        $this->log_booking_activity($booking_id, 'claimed', 'Tickets claimed at entrance');
        
        wp_send_json_success('Tickets claimed successfully');
    }
    
    public function cancel_booking() {
        check_ajax_referer('mwb_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $booking_id = sanitize_text_field($_POST['booking_id']);
        $reason = sanitize_textarea_field($_POST['reason'] ?? '');
        
        if (empty($booking_id)) {
            wp_send_json_error('Booking ID is required');
        }
        
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking) {
            wp_send_json_error('Booking not found');
        }
        
        if ($booking->booking_status === 'cancelled') {
            wp_send_json_error('Booking is already cancelled');
        }
        
        // Update booking status
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $result = $wpdb->update(
            $bookings_table,
            array('booking_status' => 'cancelled'),
            array('booking_id' => $booking_id)
        );
        
        if ($result === false) {
            wp_send_json_error('Failed to cancel booking');
        }
        
        // Restore availability
        $this->restore_availability($booking);
        
        // Send cancellation notification
        $this->send_cancellation_notification($booking, $reason);
        
        // Log activity
        $this->log_booking_activity($booking_id, 'cancelled', "Booking cancelled. Reason: {$reason}");
        
        wp_send_json_success('Booking cancelled successfully');
    }
    
    private function restore_availability($booking) {
        $total_tickets = $booking->general_tickets + $booking->child_tickets + $booking->senior_tickets;
        
        global $wpdb;
        $availability_table = $wpdb->prefix . 'mwb_availability';
        
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$availability_table} 
                 SET booked_slots = booked_slots - %d,
                     available_slots = available_slots + %d
                 WHERE location_id = %d AND availability_date = %s",
                $total_tickets,
                $total_tickets,
                $booking->location_id,
                $booking->booking_date
            )
        );
        
        // Update status based on new availability
        $this->update_date_availability_status($booking->location_id, $booking->booking_date);
    }
    
    private function send_cancellation_notification($booking, $reason) {
        $to = $booking->customer_email;
        $subject = 'Marine World Booking Cancellation - ' . $booking->booking_id;
        
        $message = sprintf(
            "Dear %s,\n\n" .
            "We regret to inform you that your Marine World booking has been cancelled.\n\n" .
            "Booking Details:\n" .
            "- Booking ID: %s\n" .
            "- Date: %s\n" .
            "- Amount: ₹%s\n\n" .
            "Reason: %s\n\n" .
            "If payment was made, refund will be processed within 5-7 working days.\n\n" .
            "For any queries, please contact us at info@marineworld.in or +91-9999999999.\n\n" .
            "We apologize for the inconvenience.\n\n" .
            "Best regards,\n" .
            "Marine World Team",
            $booking->customer_name,
            $booking->booking_id,
            date('d/m/Y', strtotime($booking->booking_date)),
            number_format($booking->total_amount, 2),
            $reason ?: 'Administrative reasons'
        );
        
        wp_mail($to, $subject, $message);
    }
    
    public function resend_confirmation() {
        check_ajax_referer('mwb_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $booking_id = sanitize_text_field($_POST['booking_id']);
        
        if (empty($booking_id)) {
            wp_send_json_error('Booking ID is required');
        }
        
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking) {
            wp_send_json_error('Booking not found');
        }
        
        // Resend confirmation
        $result = $this->notification_manager->send_booking_confirmation($booking);
        
        if ($result) {
            $this->log_booking_activity($booking_id, 'resent', 'Confirmation email resent');
            wp_send_json_success('Confirmation sent successfully');
        } else {
            wp_send_json_error('Failed to send confirmation');
        }
    }
    
    public function cleanup_expired_bookings() {
        // Cancel unpaid bookings older than 30 minutes
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $expired_bookings = $wpdb->get_results(
            "SELECT * FROM {$bookings_table} 
             WHERE payment_status = 'pending' 
             AND booking_status = 'pending'
             AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)"
        );
        
        foreach ($expired_bookings as $booking) {
            // Cancel booking
            $wpdb->update(
                $bookings_table,
                array('booking_status' => 'expired'),
                array('id' => $booking->id)
            );
            
            // Restore availability
            $this->restore_availability($booking);
            
            // Log activity
            $this->log_booking_activity($booking->booking_id, 'expired', 'Booking expired due to non-payment');
        }
        
        error_log('Marine World: Cleaned up ' . count($expired_bookings) . ' expired bookings');
    }
    
    public function update_availability_status() {
        // Update status for all availability records based on current bookings
        global $wpdb;
        $availability_table = $wpdb->prefix . 'mwb_availability';
        
        $availability_records = $wpdb->get_results(
            "SELECT * FROM {$availability_table} 
             WHERE availability_date >= CURDATE() 
             AND availability_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY)"
        );
        
        foreach ($availability_records as $record) {
            $this->update_date_availability_status($record->location_id, $record->availability_date);
        }
    }
    
    private function update_date_availability_status($location_id, $date) {
        global $wpdb;
        $availability_table = $wpdb->prefix . 'mwb_availability';
        
        $availability = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$availability_table} 
                 WHERE location_id = %d AND availability_date = %s",
                $location_id,
                $date
            )
        );
        
        if (!$availability) {
            return;
        }
        
        $available_percentage = ($availability->available_slots / $availability->total_capacity) * 100;
        $status = 'available';
        
        if ($available_percentage <= 0) {
            $status = 'sold_out';
        } elseif ($available_percentage <= 20) {
            $status = 'limited';
        }
        
        if ($availability->is_blackout) {
            $status = 'blackout';
        }
        
        $wpdb->update(
            $availability_table,
            array('status' => $status),
            array('location_id' => $location_id, 'availability_date' => $date)
        );
    }
    
    private function log_booking_activity($booking_id, $action, $description) {
        global $wpdb;
        
        // Create activity log table if it doesn't exist
        $activity_table = $wpdb->prefix . 'mwb_booking_activity';
        
        $sql = "CREATE TABLE IF NOT EXISTS {$activity_table} (
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
        )";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Insert activity log
        $wpdb->insert(
            $activity_table,
            array(
                'booking_id' => $booking_id,
                'action' => $action,
                'description' => $description,
                'user_id' => get_current_user_id() ?: null,
                'ip_address' => $this->get_client_ip(),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
            )
        );
    }
    
    private function get_client_ip() {
        $ip_keys = array('HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR');
        
        foreach ($ip_keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
    
    // Booking analytics and reporting
    public function get_booking_analytics($date_from = null, $date_to = null, $location_id = null) {
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $where_clauses = array("booking_status = 'confirmed'", "payment_status = 'completed'");
        $params = array();
        
        if ($date_from) {
            $where_clauses[] = "booking_date >= %s";
            $params[] = $date_from;
        }
        
        if ($date_to) {
            $where_clauses[] = "booking_date <= %s";
            $params[] = $date_to;
        }
        
        if ($location_id) {
            $where_clauses[] = "location_id = %d";
            $params[] = $location_id;
        }
        
        $where_sql = implode(' AND ', $where_clauses);
        
        // Basic stats
        $stats = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT 
                    COUNT(*) as total_bookings,
                    SUM(total_amount) as total_revenue,
                    SUM(general_tickets + child_tickets + senior_tickets) as total_tickets,
                    AVG(total_amount) as average_booking_value,
                    COUNT(DISTINCT customer_email) as unique_customers
                 FROM {$bookings_table} 
                 WHERE {$where_sql}",
                ...$params
            )
        );
        
        // Daily breakdown
        $daily_stats = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT 
                    booking_date,
                    COUNT(*) as bookings,
                    SUM(total_amount) as revenue,
                    SUM(general_tickets + child_tickets + senior_tickets) as tickets
                 FROM {$bookings_table} 
                 WHERE {$where_sql}
                 GROUP BY booking_date 
                 ORDER BY booking_date",
                ...$params
            )
        );
        
        // Ticket type breakdown
        $ticket_breakdown = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT 
                    SUM(general_tickets) as general_tickets,
                    SUM(child_tickets) as child_tickets,
                    SUM(senior_tickets) as senior_tickets
                 FROM {$bookings_table} 
                 WHERE {$where_sql}",
                ...$params
            )
        );
        
        // Top hours for bookings (creation time)
        $booking_hours = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT 
                    HOUR(created_at) as hour,
                    COUNT(*) as bookings
                 FROM {$bookings_table} 
                 WHERE {$where_sql}
                 GROUP BY HOUR(created_at) 
                 ORDER BY bookings DESC 
                 LIMIT 5",
                ...$params
            )
        );
        
        // Payment method distribution
        $payment_methods = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT 
                    payment_method,
                    COUNT(*) as count,
                    SUM(total_amount) as revenue
                 FROM {$bookings_table} 
                 WHERE {$where_sql} AND payment_method IS NOT NULL
                 GROUP BY payment_method",
                ...$params
            )
        );
        
        return array(
            'overview' => $stats,
            'daily_breakdown' => $daily_stats,
            'ticket_breakdown' => $ticket_breakdown,
            'booking_hours' => $booking_hours,
            'payment_methods' => $payment_methods
        );
    }
    
    // Generate reports
    public function generate_booking_report($format = 'csv', $filters = array()) {
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $where_clauses = array();
        $params = array();
        
        if (!empty($filters['date_from'])) {
            $where_clauses[] = "booking_date >= %s";
            $params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $where_clauses[] = "booking_date <= %s";
            $params[] = $filters['date_to'];
        }
        
        if (!empty($filters['location_id'])) {
            $where_clauses[] = "location_id = %d";
            $params[] = $filters['location_id'];
        }
        
        if (!empty($filters['status'])) {
            $where_clauses[] = "booking_status = %s";
            $params[] = $filters['status'];
        }
        
        $where_sql = empty($where_clauses) ? '1=1' : implode(' AND ', $where_clauses);
        
        $bookings = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT 
                    booking_id,
                    location_id,
                    booking_date,
                    customer_name,
                    customer_email,
                    customer_phone,
                    general_tickets,
                    child_tickets,
                    senior_tickets,
                    (general_tickets + child_tickets + senior_tickets) as total_tickets,
                    subtotal,
                    discount_amount,
                    total_amount,
                    payment_status,
                    booking_status,
                    created_at
                 FROM {$bookings_table} 
                 WHERE {$where_sql}
                 ORDER BY created_at DESC",
                ...$params
            )
        );
        
        if ($format === 'csv') {
            return $this->generate_csv_report($bookings);
        } elseif ($format === 'json') {
            return json_encode($bookings);
        }
        
        return $bookings;
    }
    
    private function generate_csv_report($bookings) {
        $filename = 'marine-world-bookings-' . date('Y-m-d-H-i-s') . '.csv';
        $upload_dir = wp_upload_dir();
        $file_path = $upload_dir['path'] . '/' . $filename;
        
        $file = fopen($file_path, 'w');
        
        // Headers
        $headers = array(
            'Booking ID',
            'Location ID',
            'Booking Date',
            'Customer Name',
            'Customer Email',
            'Customer Phone',
            'General Tickets',
            'Child Tickets',
            'Senior Tickets',
            'Total Tickets',
            'Subtotal',
            'Discount',
            'Total Amount',
            'Payment Status',
            'Booking Status',
            'Created At'
        );
        
        fputcsv($file, $headers);
        
        // Data rows
        foreach ($bookings as $booking) {
            $row = array(
                $booking->booking_id,
                $booking->location_id,
                $booking->booking_date,
                $booking->customer_name,
                $booking->customer_email,
                $booking->customer_phone,
                $booking->general_tickets,
                $booking->child_tickets,
                $booking->senior_tickets,
                $booking->total_tickets,
                $booking->subtotal,
                $booking->discount_amount,
                $booking->total_amount,
                $booking->payment_status,
                $booking->booking_status,
                $booking->created_at
            );
            
            fputcsv($file, $row);
        }
        
        fclose($file);
        
        return array(
            'file_path' => $file_path,
            'file_url' => $upload_dir['url'] . '/' . $filename,
            'filename' => $filename
        );
    }
    
    // Bulk operations
    public function bulk_update_bookings($booking_ids, $action, $data = array()) {
        if (!current_user_can('manage_options')) {
            return new WP_Error('unauthorized', 'Unauthorized access');
        }
        
        $results = array(
            'success' => 0,
            'failed' => 0,
            'errors' => array()
        );
        
        foreach ($booking_ids as $booking_id) {
            $booking = $this->database->get_booking($booking_id);
            
            if (!$booking) {
                $results['failed']++;
                $results['errors'][] = "Booking {$booking_id} not found";
                continue;
            }
            
            switch ($action) {
                case 'cancel':
                    $result = $this->cancel_booking_by_id($booking_id, $data['reason'] ?? '');
                    break;
                    
                case 'resend_confirmation':
                    $result = $this->notification_manager->send_booking_confirmation($booking);
                    break;
                    
                case 'mark_claimed':
                    $result = $this->mark_tickets_claimed($booking_id);
                    break;
                    
                default:
                    $result = false;
                    $results['errors'][] = "Unknown action: {$action}";
            }
            
            if ($result) {
                $results['success']++;
            } else {
                $results['failed']++;
                $results['errors'][] = "Failed to {$action} booking {$booking_id}";
            }
        }
        
        return $results;
    }
    
    private function cancel_booking_by_id($booking_id, $reason = '') {
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking || $booking->booking_status === 'cancelled') {
            return false;
        }
        
        // Update booking status
        $result = $wpdb->update(
            $bookings_table,
            array('booking_status' => 'cancelled'),
            array('booking_id' => $booking_id)
        );
        
        if ($result === false) {
            return false;
        }
        
        // Restore availability
        $this->restore_availability($booking);
        
        // Send notification
        $this->send_cancellation_notification($booking, $reason);
        
        // Log activity
        $this->log_booking_activity($booking_id, 'cancelled', "Bulk cancelled. Reason: {$reason}");
        
        return true;
    }
    
    private function mark_tickets_claimed($booking_id) {
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking || $booking->tickets_claimed || $booking->booking_status !== 'confirmed') {
            return false;
        }
        
        $result = $wpdb->update(
            $bookings_table,
            array(
                'tickets_claimed' => 1,
                'claimed_at' => current_time('mysql')
            ),
            array('booking_id' => $booking_id)
        );
        
        if ($result === false) {
            return false;
        }
        
        $this->log_booking_activity($booking_id, 'claimed', 'Tickets marked as claimed (bulk operation)');
        
        return true;
    }
    
    // Booking search and filtering
    public function search_bookings($search_term, $filters = array()) {
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $where_clauses = array();
        $params = array();
        
        // Search term
        if (!empty($search_term)) {
            $where_clauses[] = "(booking_id LIKE %s OR customer_name LIKE %s OR customer_email LIKE %s OR customer_phone LIKE %s)";
            $search_wildcard = '%' . $wpdb->esc_like($search_term) . '%';
            $params = array_merge($params, array($search_wildcard, $search_wildcard, $search_wildcard, $search_wildcard));
        }
        
        // Filters
        foreach ($filters as $key => $value) {
            if (empty($value)) continue;
            
            switch ($key) {
                case 'date_from':
                    $where_clauses[] = "booking_date >= %s";
                    $params[] = $value;
                    break;
                    
                case 'date_to':
                    $where_clauses[] = "booking_date <= %s";
                    $params[] = $value;
                    break;
                    
                case 'location_id':
                    $where_clauses[] = "location_id = %d";
                    $params[] = $value;
                    break;
                    
                case 'booking_status':
                    $where_clauses[] = "booking_status = %s";
                    $params[] = $value;
                    break;
                    
                case 'payment_status':
                    $where_clauses[] = "payment_status = %s";
                    $params[] = $value;
                    break;
            }
        }
        
        $where_sql = empty($where_clauses) ? '1=1' : implode(' AND ', $where_clauses);
        
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$bookings_table} 
                 WHERE {$where_sql} 
                 ORDER BY created_at DESC 
                 LIMIT 100",
                ...$params
            )
        );
    }
    
    // Capacity management
    public function update_location_capacity($location_id, $date, $new_capacity) {
        if (!current_user_can('manage_options')) {
            return new WP_Error('unauthorized', 'Unauthorized access');
        }
        
        global $wpdb;
        $availability_table = $wpdb->prefix . 'mwb_availability';
        
        $current_availability = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$availability_table} 
                 WHERE location_id = %d AND availability_date = %s",
                $location_id,
                $date
            )
        );
        
        if (!$current_availability) {
            // Create new availability record
            $wpdb->insert(
                $availability_table,
                array(
                    'location_id' => $location_id,
                    'availability_date' => $date,
                    'total_capacity' => $new_capacity,
                    'booked_slots' => 0,
                    'available_slots' => $new_capacity,
                    'status' => 'available'
                )
            );
        } else {
            // Update existing record
            $new_available = $new_capacity - $current_availability->booked_slots;
            
            if ($new_available < 0) {
                return new WP_Error('capacity_too_low', 'New capacity is lower than already booked tickets');
            }
            
            $wpdb->update(
                $availability_table,
                array(
                    'total_capacity' => $new_capacity,
                    'available_slots' => $new_available
                ),
                array('location_id' => $location_id, 'availability_date' => $date)
            );
            
            // Update status
            $this->update_date_availability_status($location_id, $date);
        }
        
        return true;
    }
}
?>