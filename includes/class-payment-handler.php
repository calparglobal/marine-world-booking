<?php

class MWB_Payment_Handler {
    
    private $database;
    private $notification_manager;
    
    // ICICI Payment Gateway Configuration
    private $gateway_config;
    
    public function __construct() {
        $this->database = new MWB_Database();
        $this->notification_manager = new MWB_Notification_Manager();
        
        $this->gateway_config = array(
            'merchant_id' => get_option('mwb_icici_merchant_id', ''),
            'access_code' => get_option('mwb_icici_access_code', ''),
            'working_key' => get_option('mwb_icici_working_key', ''),
            'test_mode' => get_option('mwb_icici_test_mode', 'yes'),
            'currency' => 'INR',
            'language' => 'EN'
        );
        
        $this->init_hooks();
    }
    
    private function init_hooks() {
        // Handle payment callbacks
        add_action('wp_ajax_mwb_payment_success', array($this, 'handle_payment_success'));
        add_action('wp_ajax_nopriv_mwb_payment_success', array($this, 'handle_payment_success'));
        add_action('wp_ajax_mwb_payment_failure', array($this, 'handle_payment_failure'));
        add_action('wp_ajax_nopriv_mwb_payment_failure', array($this, 'handle_payment_failure'));
        
        // Payment webhook endpoint
        add_action('rest_api_init', array($this, 'register_webhook_endpoint'));
        
        // Admin payment actions
        add_action('wp_ajax_mwb_process_refund', array($this, 'process_refund'));
        add_action('wp_ajax_mwb_verify_payment', array($this, 'verify_payment'));
    }
    
    public function register_webhook_endpoint() {
        register_rest_route('marine-world/v1', '/payment-webhook', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_payment_webhook'),
            'permission_callback' => '__return_true'
        ));
    }
    
    public function initiate_payment($booking_id, $return_url = '') {
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking) {
            return new WP_Error('booking_not_found', 'Booking not found');
        }
        
        if ($booking->payment_status === 'completed') {
            return new WP_Error('already_paid', 'Payment already completed');
        }
        
        $payment_data = $this->prepare_payment_data($booking, $return_url);
        
        if ($this->gateway_config['test_mode'] === 'yes') {
            return $this->initiate_test_payment($payment_data);
        } else {
            return $this->initiate_icici_payment($payment_data);
        }
    }
    
    private function prepare_payment_data($booking, $return_url = '') {
        $order_id = $booking->booking_id . '_' . time();
        
        // Store payment session
        $this->store_payment_session($order_id, $booking->booking_id);
        
        return array(
            'order_id' => $order_id,
            'booking_id' => $booking->booking_id,
            'amount' => $booking->total_amount,
            'currency' => $this->gateway_config['currency'],
            'customer_name' => $booking->customer_name,
            'customer_email' => $booking->customer_email,
            'customer_phone' => $booking->customer_phone,
            'description' => 'Marine World Booking - ' . $booking->booking_id,
            'return_url' => $return_url ?: home_url('/booking-success/'),
            'cancel_url' => home_url('/booking-cancelled/'),
            'webhook_url' => rest_url('marine-world/v1/payment-webhook')
        );
    }
    
    private function store_payment_session($order_id, $booking_id) {
        global $wpdb;
        
        // Create payment sessions table if not exists
        $table_name = $wpdb->prefix . 'mwb_payment_sessions';
        
        $sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            order_id varchar(100) NOT NULL UNIQUE,
            booking_id varchar(50) NOT NULL,
            status varchar(20) DEFAULT 'pending',
            gateway_response text,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_order_id (order_id),
            KEY idx_booking_id (booking_id)
        )";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Insert payment session
        $wpdb->insert(
            $table_name,
            array(
                'order_id' => $order_id,
                'booking_id' => $booking_id,
                'status' => 'pending'
            )
        );
    }
    
    private function initiate_icici_payment($payment_data) {
        // ICICI Payment Gateway Integration
        $gateway_url = $this->gateway_config['test_mode'] === 'yes' 
            ? 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
            : 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction';
        
        $parameters = array(
            'merchant_id' => $this->gateway_config['merchant_id'],
            'order_id' => $payment_data['order_id'],
            'amount' => $payment_data['amount'],
            'currency' => $payment_data['currency'],
            'redirect_url' => admin_url('admin-ajax.php?action=mwb_payment_success'),
            'cancel_url' => admin_url('admin-ajax.php?action=mwb_payment_failure'),
            'language' => $this->gateway_config['language'],
            'billing_name' => $payment_data['customer_name'],
            'billing_email' => $payment_data['customer_email'],
            'billing_tel' => $payment_data['customer_phone'],
            'delivery_name' => $payment_data['customer_name'],
            'delivery_tel' => $payment_data['customer_phone'],
            'merchant_param1' => $payment_data['booking_id'],
            'merchant_param2' => 'marine_world_booking'
        );
        
        $encrypted_data = $this->encrypt_data(http_build_query($parameters));
        
        return array(
            'gateway_url' => $gateway_url,
            'encrypted_data' => $encrypted_data,
            'access_code' => $this->gateway_config['access_code'],
            'order_id' => $payment_data['order_id']
        );
    }
    
    private function initiate_test_payment($payment_data) {
        // Test payment mode - simulate payment gateway
        return array(
            'test_mode' => true,
            'gateway_url' => admin_url('admin-ajax.php?action=mwb_test_payment'),
            'payment_data' => $payment_data
        );
    }
    
    private function encrypt_data($plainText) {
        $key = $this->gateway_config['working_key'];
        $secretKey = $this->hex_to_binary(md5($key));
        $initVector = pack("C*", 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f);
        $openMode = openssl_encrypt($plainText, 'AES-128-CBC', $secretKey, OPENSSL_RAW_DATA, $initVector);
        $encryptedText = bin2hex($openMode);
        return $encryptedText;
    }
    
    private function decrypt_data($encryptedText) {
        $key = $this->gateway_config['working_key'];
        $secretKey = $this->hex_to_binary(md5($key));
        $initVector = pack("C*", 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f);
        $encryptedText = $this->hex_to_binary($encryptedText);
        $decryptedText = openssl_decrypt($encryptedText, 'AES-128-CBC', $secretKey, OPENSSL_RAW_DATA, $initVector);
        return $decryptedText;
    }
    
    private function hex_to_binary($hexString) {
        $length = strlen($hexString);
        $binString = "";
        $count = 0;
        while ($count < $length) {
            $subString = substr($hexString, $count, 2);
            $packedString = pack("H*", $subString);
            if ($count == 0) {
                $binString = $packedString;
            } else {
                $binString .= $packedString;
            }
            $count += 2;
        }
        return $binString;
    }
    
    public function handle_payment_success() {
        $encrypted_data = $_POST['encResp'] ?? '';
        
        if (empty($encrypted_data)) {
            wp_die('Invalid payment response');
        }
        
        $decrypted_data = $this->decrypt_data($encrypted_data);
        parse_str($decrypted_data, $response_array);
        
        $order_status = $response_array['order_status'] ?? '';
        $order_id = $response_array['order_id'] ?? '';
        $tracking_id = $response_array['tracking_id'] ?? '';
        $bank_ref_no = $response_array['bank_ref_no'] ?? '';
        $failure_message = $response_array['failure_message'] ?? '';
        $payment_mode = $response_array['payment_mode'] ?? '';
        $status_code = $response_array['status_code'] ?? '';
        $status_message = $response_array['status_message'] ?? '';
        
        // Get booking ID from order
        $booking_id = $this->get_booking_from_order($order_id);
        
        if (!$booking_id) {
            wp_die('Invalid order ID');
        }
        
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking) {
            wp_die('Booking not found');
        }
        
        // Update payment session
        $this->update_payment_session($order_id, 'completed', $response_array);
        
        if ($order_status === 'Success') {
            // Payment successful
            $this->process_successful_payment($booking_id, array(
                'payment_id' => $tracking_id,
                'bank_ref_no' => $bank_ref_no,
                'payment_mode' => $payment_mode,
                'gateway_response' => json_encode($response_array)
            ));
            
            // Redirect to success page
            wp_redirect(home_url("/booking-success/?booking_id={$booking_id}"));
            exit;
        } else {
            // Payment failed
            $this->process_failed_payment($booking_id, array(
                'failure_message' => $failure_message,
                'status_code' => $status_code,
                'status_message' => $status_message,
                'gateway_response' => json_encode($response_array)
            ));
            
            // Redirect to failure page
            wp_redirect(home_url("/booking-failed/?booking_id={$booking_id}&error=" . urlencode($failure_message)));
            exit;
        }
    }
    
    public function handle_payment_failure() {
        $encrypted_data = $_POST['encResp'] ?? '';
        
        if (empty($encrypted_data)) {
            wp_die('Invalid payment response');
        }
        
        $decrypted_data = $this->decrypt_data($encrypted_data);
        parse_str($decrypted_data, $response_array);
        
        $order_id = $response_array['order_id'] ?? '';
        $booking_id = $this->get_booking_from_order($order_id);
        
        if ($booking_id) {
            $this->process_failed_payment($booking_id, array(
                'failure_message' => $response_array['failure_message'] ?? 'Payment cancelled by user',
                'gateway_response' => json_encode($response_array)
            ));
        }
        
        // Redirect to failure page
        wp_redirect(home_url("/booking-failed/?booking_id={$booking_id}"));
        exit;
    }
    
    public function handle_payment_webhook($request) {
        $data = $request->get_json_params();
        
        // Verify webhook authenticity
        if (!$this->verify_webhook_signature($data, $request->get_header('signature'))) {
            return new WP_Error('invalid_signature', 'Invalid webhook signature', array('status' => 401));
        }
        
        $order_id = $data['order_id'] ?? '';
        $status = $data['status'] ?? '';
        $payment_id = $data['payment_id'] ?? '';
        
        $booking_id = $this->get_booking_from_order($order_id);
        
        if (!$booking_id) {
            return new WP_Error('invalid_order', 'Invalid order ID', array('status' => 400));
        }
        
        if ($status === 'success') {
            $this->process_successful_payment($booking_id, array(
                'payment_id' => $payment_id,
                'gateway_response' => json_encode($data)
            ));
        } else {
            $this->process_failed_payment($booking_id, array(
                'failure_message' => $data['failure_message'] ?? 'Payment failed',
                'gateway_response' => json_encode($data)
            ));
        }
        
        return rest_ensure_response(array('status' => 'processed'));
    }
    
    private function verify_webhook_signature($data, $signature) {
        // Implement signature verification based on your payment gateway
        // This is a placeholder implementation
        $calculated_signature = hash_hmac('sha256', json_encode($data), $this->gateway_config['working_key']);
        return hash_equals($calculated_signature, $signature);
    }
    
    private function get_booking_from_order($order_id) {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'mwb_payment_sessions';
        
        $session = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT booking_id FROM {$sessions_table} WHERE order_id = %s",
                $order_id
            )
        );
        
        return $session ? $session->booking_id : null;
    }
    
    private function update_payment_session($order_id, $status, $response_data) {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'mwb_payment_sessions';
        
        $wpdb->update(
            $sessions_table,
            array(
                'status' => $status,
                'gateway_response' => json_encode($response_data)
            ),
            array('order_id' => $order_id)
        );
    }
    
    private function process_successful_payment($booking_id, $payment_data) {
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        // Update booking with payment details
        $update_data = array(
            'payment_status' => 'completed',
            'booking_status' => 'confirmed',
            'payment_id' => $payment_data['payment_id'],
            'payment_method' => $payment_data['payment_mode'] ?? 'ICICI Gateway'
        );
        
        $result = $wpdb->update(
            $bookings_table,
            $update_data,
            array('booking_id' => $booking_id)
        );
        
        if ($result !== false) {
            // Log payment transaction
            $this->log_payment_transaction($booking_id, 'success', $payment_data);
            
            // Send confirmation notifications
            $booking = $this->database->get_booking($booking_id);
            $this->notification_manager->send_booking_confirmation($booking);
            
            // Trigger successful payment hook
            do_action('mwb_payment_successful', $booking_id, $payment_data);
        }
        
        return $result !== false;
    }
    
    private function process_failed_payment($booking_id, $failure_data) {
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        // Update booking status
        $wpdb->update(
            $bookings_table,
            array('payment_status' => 'failed'),
            array('booking_id' => $booking_id)
        );
        
        // Log failed transaction
        $this->log_payment_transaction($booking_id, 'failed', $failure_data);
        
        // Send admin notification about failed payment
        $this->send_payment_failure_notification($booking_id, $failure_data);
        
        // Trigger failed payment hook
        do_action('mwb_payment_failed', $booking_id, $failure_data);
        
        return true;
    }
    
    private function log_payment_transaction($booking_id, $status, $data) {
        global $wpdb;
        
        // Create payment log table if not exists
        $table_name = $wpdb->prefix . 'mwb_payment_log';
        
        $sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
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
        )";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Insert payment log
        $booking = $this->database->get_booking($booking_id);
        
        $wpdb->insert(
            $table_name,
            array(
                'booking_id' => $booking_id,
                'payment_id' => $data['payment_id'] ?? null,
                'status' => $status,
                'amount' => $booking ? $booking->total_amount : null,
                'gateway_response' => $data['gateway_response'] ?? json_encode($data),
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
    
    private function send_payment_failure_notification($booking_id, $failure_data) {
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking) {
            return;
        }
        
        $admin_email = get_option('admin_email');
        $subject = 'Marine World Payment Failed - ' . $booking_id;
        
        $message = sprintf(
            "Payment failed for booking:\n\n" .
            "Booking ID: %s\n" .
            "Customer: %s (%s)\n" .
            "Amount: ₹%s\n" .
            "Failure Reason: %s\n" .
            "Timestamp: %s\n\n" .
            "Gateway Response: %s",
            $booking->booking_id,
            $booking->customer_name,
            $booking->customer_email,
            number_format($booking->total_amount, 2),
            $failure_data['failure_message'] ?? 'Unknown error',
            current_time('mysql'),
            $failure_data['gateway_response'] ?? 'No response data'
        );
        
        wp_mail($admin_email, $subject, $message);
    }
    
    // Admin functions
    public function process_refund() {
        check_ajax_referer('mwb_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $booking_id = sanitize_text_field($_POST['booking_id']);
        $refund_amount = floatval($_POST['refund_amount']);
        $refund_reason = sanitize_textarea_field($_POST['refund_reason']);
        
        if (empty($booking_id) || $refund_amount <= 0) {
            wp_send_json_error('Invalid refund parameters');
        }
        
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking) {
            wp_send_json_error('Booking not found');
        }
        
        if ($booking->payment_status !== 'completed') {
            wp_send_json_error('Cannot refund unpaid booking');
        }
        
        if ($refund_amount > $booking->total_amount) {
            wp_send_json_error('Refund amount cannot exceed booking amount');
        }
        
        // Process refund through gateway
        $refund_result = $this->initiate_gateway_refund($booking, $refund_amount, $refund_reason);
        
        if (is_wp_error($refund_result)) {
            wp_send_json_error($refund_result->get_error_message());
        }
        
        // Update booking status
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $wpdb->update(
            $bookings_table,
            array('booking_status' => 'refunded'),
            array('booking_id' => $booking_id)
        );
        
        // Log refund
        $this->log_payment_transaction($booking_id, 'refunded', array(
            'refund_amount' => $refund_amount,
            'refund_reason' => $refund_reason,
            'refund_id' => $refund_result['refund_id'] ?? null
        ));
        
        // Send refund notification
        $this->send_refund_notification($booking, $refund_amount, $refund_reason);
        
        wp_send_json_success('Refund processed successfully');
    }
    
    private function initiate_gateway_refund($booking, $amount, $reason) {
        // Implement actual refund through ICICI gateway
        // This is a placeholder implementation
        
        if ($this->gateway_config['test_mode'] === 'yes') {
            // Test mode - simulate successful refund
            return array(
                'refund_id' => 'TEST_REFUND_' . time(),
                'status' => 'success',
                'message' => 'Test refund processed'
            );
        }
        
        // In production, implement actual ICICI refund API call
        // For now, return success for manual processing
        return array(
            'refund_id' => 'MANUAL_REFUND_' . time(),
            'status' => 'manual',
            'message' => 'Refund to be processed manually'
        );
    }
    
    private function send_refund_notification($booking, $refund_amount, $reason) {
        $to = $booking->customer_email;
        $subject = 'Marine World Booking Refund - ' . $booking->booking_id;
        
        $message = sprintf(
            "Dear %s,\n\n" .
            "Your refund for Marine World booking has been processed.\n\n" .
            "Booking Details:\n" .
            "- Booking ID: %s\n" .
            "- Original Amount: ₹%s\n" .
            "- Refund Amount: ₹%s\n" .
            "- Reason: %s\n\n" .
            "The refund will be credited to your original payment method within 5-7 working days.\n\n" .
            "For any queries, please contact us at info@marineworld.in\n\n" .
            "Thank you,\n" .
            "Marine World Team",
            $booking->customer_name,
            $booking->booking_id,
            number_format($booking->total_amount, 2),
            number_format($refund_amount, 2),
            $reason
        );
        
        wp_mail($to, $subject, $message);
    }
    
    public function verify_payment() {
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
        
        // Verify payment status with gateway
        $verification_result = $this->verify_payment_with_gateway($booking);
        
        wp_send_json_success($verification_result);
    }
    
    private function verify_payment_with_gateway($booking) {
        // Implement payment verification with ICICI gateway
        // This is a placeholder implementation
        
        if ($this->gateway_config['test_mode'] === 'yes') {
            return array(
                'status' => $booking->payment_status,
                'verified' => true,
                'message' => 'Test mode verification'
            );
        }
        
        // In production, implement actual verification API call
        return array(
            'status' => $booking->payment_status,
            'verified' => false,
            'message' => 'Manual verification required'
        );
    }
    
    // Payment analytics
    public function get_payment_analytics($date_from = null, $date_to = null) {
        global $wpdb;
        $payments_table = $wpdb->prefix . 'mwb_payment_log';
        
        $where_clauses = array();
        $params = array();
        
        if ($date_from) {
            $where_clauses[] = "DATE(created_at) >= %s";
            $params[] = $date_from;
        }
        
        if ($date_to) {
            $where_clauses[] = "DATE(created_at) <= %s";
            $params[] = $date_to;
        }
        
        $where_sql = empty($where_clauses) ? '1=1' : implode(' AND ', $where_clauses);
        
        // Payment status distribution
        $status_distribution = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT status, COUNT(*) as count, SUM(amount) as total_amount 
                 FROM {$payments_table} 
                 WHERE {$where_sql} 
                 GROUP BY status",
                ...$params
            )
        );
        
        // Daily payment trends
        $daily_trends = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT DATE(created_at) as date, 
                        COUNT(*) as transactions,
                        SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as successful_amount,
                        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_count,
                        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
                 FROM {$payments_table} 
                 WHERE {$where_sql} 
                 GROUP BY DATE(created_at) 
                 ORDER BY date DESC",
                ...$params
            )
        );
        
        // Success rate calculation
        $success_rate = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_transactions,
                    (SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*) * 100) as success_rate
                 FROM {$payments_table} 
                 WHERE {$where_sql}",
                ...$params
            )
        );
        
        return array(
            'status_distribution' => $status_distribution,
            'daily_trends' => $daily_trends,
            'success_rate' => $success_rate
        );
    }
    
    // Payment method management
    public function get_available_payment_methods() {
        $methods = array(
            'icici_gateway' => array(
                'name' => 'ICICI Payment Gateway',
                'description' => 'Credit Card, Debit Card, Net Banking, UPI',
                'enabled' => !empty($this->gateway_config['merchant_id']),
                'test_mode' => $this->gateway_config['test_mode'] === 'yes'
            )
        );
        
        return apply_filters('mwb_payment_methods', $methods);
    }
    
    // Recurring payment cleanup
    public function cleanup_old_payment_sessions() {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'mwb_payment_sessions';
        
        // Delete sessions older than 24 hours
        $deleted = $wpdb->query(
            "DELETE FROM {$sessions_table} 
             WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) 
             AND status = 'pending'"
        );
        
        error_log("Marine World: Cleaned up {$deleted} old payment sessions");
        
        return $deleted;
    }
}

// Schedule cleanup of old payment sessions
if (!wp_next_scheduled('mwb_cleanup_payment_sessions')) {
    wp_schedule_event(time(), 'daily', 'mwb_cleanup_payment_sessions');
}

add_action('mwb_cleanup_payment_sessions', function() {
    $payment_handler = new MWB_Payment_Handler();
    $payment_handler->cleanup_old_payment_sessions();
});
?>