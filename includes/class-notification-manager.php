<?php

class MWB_Notification_Manager {
    
    private $database;
    
    public function __construct() {
        $this->database = new MWB_Database();
    }
    
    public function send_booking_confirmation($booking) {
        if (!$booking) {
            return false;
        }
        
        // Send email confirmation
        $this->send_confirmation_email($booking);
        
        // Send SMS confirmation
        $this->send_confirmation_sms($booking);
        
        // Send WhatsApp notification
        $this->send_whatsapp_notification($booking);
        
        // Send admin notification
        $this->send_admin_notification($booking);
        
        return true;
    }
    
    private function send_confirmation_email($booking) {
        $to = $booking->customer_email;
        $subject = 'Marine World Booking Confirmation - ' . $booking->booking_id;
        
        $message = $this->get_email_template($booking);
        
        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
            'From: Marine World <noreply@marineworld.in>',
            'Reply-To: info@marineworld.in'
        );
        
        $attachments = array();
        
        // Generate PDF ticket
        $pdf_path = $this->generate_pdf_ticket($booking);
        if ($pdf_path) {
            $attachments[] = $pdf_path;
        }
        
        wp_mail($to, $subject, $message, $headers, $attachments);
        
        // Send to third party if applicable
        if ($booking->third_party_booking && $booking->third_party_email) {
            wp_mail($booking->third_party_email, $subject, $message, $headers, $attachments);
        }
        
        // Clean up temporary PDF file
        if ($pdf_path && file_exists($pdf_path)) {
            unlink($pdf_path);
        }
    }
    
    private function get_email_template($booking) {
        $addons_data = json_decode($booking->addons_data, true) ?: array();
        $ticket_types = array(
            'general' => 'General',
            'child' => 'Child',
            'senior' => 'Senior Citizen'
        );
        
        ob_start();
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Marine World Booking Confirmation</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #007cba; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .booking-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
                .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
                .total-row { border-top: 2px solid #007cba; padding-top: 10px; font-weight: bold; }
                .qr-code { text-align: center; margin: 20px 0; }
                .footer { background: #343a40; color: white; padding: 15px; text-align: center; font-size: 12px; }
                .important { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Marine World</h1>
                    <h2>Booking Confirmation</h2>
                </div>
                
                <div class="content">
                    <p>Dear <?php echo esc_html($booking->customer_name); ?>,</p>
                    
                    <p>Thank you for booking with Marine World! Your booking has been confirmed.</p>
                    
                    <div class="booking-details">
                        <h3>Booking Details</h3>
                        <div class="detail-row">
                            <span>Booking ID:</span>
                            <span><strong><?php echo esc_html($booking->booking_id); ?></strong></span>
                        </div>
                        <div class="detail-row">
                            <span>Visit Date:</span>
                            <span><?php echo date('l, F j, Y', strtotime($booking->booking_date)); ?></span>
                        </div>
                        <div class="detail-row">
                            <span>Customer Name:</span>
                            <span><?php echo esc_html($booking->customer_name); ?></span>
                        </div>
                        <div class="detail-row">
                            <span>Email:</span>
                            <span><?php echo esc_html($booking->customer_email); ?></span>
                        </div>
                        <div class="detail-row">
                            <span>Phone:</span>
                            <span><?php echo esc_html($booking->customer_phone); ?></span>
                        </div>
                    </div>
                    
                    <div class="booking-details">
                        <h3>Ticket Details</h3>
                        <?php foreach ($ticket_types as $type => $name): ?>
                            <?php $count = $booking->{"${type}_tickets"}; ?>
                            <?php if ($count > 0): ?>
                                <div class="detail-row">
                                    <span><?php echo $name; ?> (x<?php echo $count; ?>)</span>
                                    <span>₹<?php echo number_format($count * (marineWorldBooking.tickets[$type].price ?? 0), 2); ?></span>
                                </div>
                            <?php endif; ?>
                        <?php endforeach; ?>
                        
                        <?php if (!empty($addons_data)): ?>
                            <h4>Add-ons</h4>
                            <?php foreach ($addons_data as $addon_id => $quantity): ?>
                                <div class="detail-row">
                                    <span>Add-on (x<?php echo $quantity; ?>)</span>
                                    <span>₹<?php echo number_format($quantity * 120, 2); ?></span>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                        
                        <?php if ($booking->discount_amount > 0): ?>
                            <div class="detail-row" style="color: #28a745;">
                                <span>Discount (<?php echo ucfirst($booking->discount_type); ?>):</span>
                                <span>-₹<?php echo number_format($booking->discount_amount, 2); ?></span>
                            </div>
                        <?php endif; ?>
                        
                        <div class="detail-row total-row">
                            <span>Total Amount:</span>
                            <span>₹<?php echo number_format($booking->total_amount, 2); ?></span>
                        </div>
                    </div>
                    
                    <?php if ($booking->third_party_booking): ?>
                        <div class="booking-details">
                            <h3>Visitor Information</h3>
                            <div class="detail-row">
                                <span>Visitor Name:</span>
                                <span><?php echo esc_html($booking->third_party_name); ?></span>
                            </div>
                            <div class="detail-row">
                                <span>Visitor Email:</span>
                                <span><?php echo esc_html($booking->third_party_email); ?></span>
                            </div>
                            <div class="detail-row">
                                <span>Visitor Phone:</span>
                                <span><?php echo esc_html($booking->third_party_phone); ?></span>
                            </div>
                        </div>
                    <?php endif; ?>
                    
                    <div class="qr-code">
                        <h3>Your Entry Ticket</h3>
                        <p>Please show this QR code at the entrance:</p>
                        <div style="background: white; padding: 20px; display: inline-block; border-radius: 10px;">
                            <img src="<?php echo $this->generate_qr_code_url($booking->qr_code); ?>" alt="QR Code" style="max-width: 200px;">
                        </div>
                        <p><strong>QR Code: <?php echo esc_html($booking->qr_code); ?></strong></p>
                    </div>
                    
                    <div class="important">
                        <h3>Important Information</h3>
                        <ul>
                            <li>Please arrive 30 minutes before your visit time</li>
                            <li>Carry a valid ID proof for verification</li>
                            <li>This ticket is valid only for the booked date</li>
                            <li>Entry is subject to availability and Marine World terms & conditions</li>
                            <li>For any queries, contact us at info@marineworld.in or +91-9999999999</li>
                        </ul>
                    </div>
                </div>
                
                <div class="footer">
                    <p>&copy; <?php echo date('Y'); ?> Marine World. All rights reserved.</p>
                    <p>Website: marineworld.in | Email: info@marineworld.in</p>
                </div>
            </div>
        </body>
        </html>
        <?php
        return ob_get_clean();
    }
    
    private function send_confirmation_sms($booking) {
        // Implementation depends on SMS service provider
        // This is a placeholder for SMS integration
        
        $phone = $booking->customer_phone;
        $message = sprintf(
            "Marine World Booking Confirmed! ID: %s, Date: %s, Amount: ₹%s. Show QR code: %s at entrance. Info: marineworld.in",
            $booking->booking_id,
            date('d/m/Y', strtotime($booking->booking_date)),
            number_format($booking->total_amount, 0),
            $booking->qr_code
        );
        
        // Log SMS for now - replace with actual SMS API call
        error_log("SMS to {$phone}: {$message}");
        
        // Example integration with popular SMS services in India:
        /*
        // For Textlocal
        $this->send_textlocal_sms($phone, $message);
        
        // For MSG91
        $this->send_msg91_sms($phone, $message);
        
        // For Twilio
        $this->send_twilio_sms($phone, $message);
        */
        
        return true;
    }
    
    private function send_whatsapp_notification($booking) {
        // WhatsApp Business API integration
        // This is a placeholder - implement based on your WhatsApp provider
        
        $phone = $booking->customer_phone;
        $message = sprintf(
            "🎉 *Marine World Booking Confirmed!*\n\n" .
            "📅 *Date:* %s\n" .
            "🎫 *Booking ID:* %s\n" .
            "💰 *Amount:* ₹%s\n" .
            "🔢 *QR Code:* %s\n\n" .
            "Please show the QR code at entrance.\n" .
            "Have a wonderful time at Marine World! 🌊",
            date('d/m/Y', strtotime($booking->booking_date)),
            $booking->booking_id,
            number_format($booking->total_amount, 0),
            $booking->qr_code
        );
        
        // Log WhatsApp message for now
        error_log("WhatsApp to {$phone}: {$message}");
        
        return true;
    }
    
    private function send_admin_notification($booking) {
        $admin_email = get_option('admin_email');
        $subject = 'New Marine World Booking - ' . $booking->booking_id;
        
        $message = sprintf(
            "New booking received:\n\n" .
            "Booking ID: %s\n" .
            "Customer: %s\n" .
            "Email: %s\n" .
            "Phone: %s\n" .
            "Visit Date: %s\n" .
            "Total Tickets: %d\n" .
            "Total Amount: ₹%s\n" .
            "Payment Status: %s\n\n" .
            "View in admin: %s",
            $booking->booking_id,
            $booking->customer_name,
            $booking->customer_email,
            $booking->customer_phone,
            date('d/m/Y', strtotime($booking->booking_date)),
            ($booking->general_tickets + $booking->child_tickets + $booking->senior_tickets),
            number_format($booking->total_amount, 2),
            $booking->payment_status,
            admin_url('admin.php?page=marine-world-bookings')
        );
        
        wp_mail($admin_email, $subject, $message);
        
        return true;
    }
    
    private function generate_pdf_ticket($booking) {
        // Generate PDF ticket using a PDF library
        // This is a simplified version - you can use libraries like TCPDF or FPDF
        
        $upload_dir = wp_upload_dir();
        $ticket_dir = $upload_dir['basedir'] . '/marine-world-tickets';
        
        if (!file_exists($ticket_dir)) {
            wp_mkdir_p($ticket_dir);
        }
        
        $filename = 'ticket-' . $booking->booking_id . '.pdf';
        $filepath = $ticket_dir . '/' . $filename;
        
        // For now, create a simple HTML to PDF conversion
        // In production, use a proper PDF library
        $html_content = $this->get_ticket_html($booking);
        
        // Simple PDF generation placeholder
        // Replace with actual PDF generation library
        file_put_contents($filepath, $html_content);
        
        return $filepath;
    }
    
    private function get_ticket_html($booking) {
        ob_start();
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Marine World Ticket</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .ticket { border: 2px solid #007cba; border-radius: 10px; padding: 20px; max-width: 400px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 15px; }
                .qr-section { text-align: center; margin: 20px 0; }
                .details { margin: 15px 0; }
                .detail-row { display: flex; justify-content: space-between; margin: 5px 0; }
                .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="header">
                    <h1>Marine World</h1>
                    <h2>Entry Ticket</h2>
                </div>
                
                <div class="qr-section">
                    <img src="<?php echo $this->generate_qr_code_url($booking->qr_code); ?>" alt="QR Code" style="width: 150px; height: 150px;">
                    <p><strong><?php echo $booking->qr_code; ?></strong></p>
                </div>
                
                <div class="details">
                    <div class="detail-row">
                        <span>Booking ID:</span>
                        <span><?php echo $booking->booking_id; ?></span>
                    </div>
                    <div class="detail-row">
                        <span>Date:</span>
                        <span><?php echo date('d/m/Y', strtotime($booking->booking_date)); ?></span>
                    </div>
                    <div class="detail-row">
                        <span>Name:</span>
                        <span><?php echo $booking->customer_name; ?></span>
                    </div>
                    <div class="detail-row">
                        <span>Tickets:</span>
                        <span><?php echo ($booking->general_tickets + $booking->child_tickets + $booking->senior_tickets); ?></span>
                    </div>
                    <div class="detail-row">
                        <span>Amount:</span>
                        <span>₹<?php echo number_format($booking->total_amount, 2); ?></span>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Show this ticket at entrance</p>
                    <p>Valid only for booked date</p>
                    <p>marineworld.in</p>
                </div>
            </div>
        </body>
        </html>
        <?php
        return ob_get_clean();
    }
    
    private function generate_qr_code_url($qr_data) {
        // Generate QR code using Google Charts API or QR code library
        $encoded_data = urlencode($qr_data);
        return "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={$encoded_data}";
    }
    
    // SMS Service Integrations (Examples)
    
    private function send_textlocal_sms($phone, $message) {
        // Textlocal SMS API integration
        $username = get_option('mwb_textlocal_username', '');
        $hash = get_option('mwb_textlocal_hash', '');
        
        if (empty($username) || empty($hash)) {
            return false;
        }
        
        $data = array(
            'username' => $username,
            'hash' => $hash,
            'sender' => 'MRNWLD',
            'numbers' => $phone,
            'message' => $message
        );
        
        $url = 'https://api.textlocal.in/send/';
        
        $response = wp_remote_post($url, array(
            'body' => $data,
            'timeout' => 30
        ));
        
        return !is_wp_error($response);
    }
    
    private function send_msg91_sms($phone, $message) {
        // MSG91 SMS API integration
        $authkey = get_option('mwb_msg91_authkey', '');
        $sender = get_option('mwb_msg91_sender', 'MRNWLD');
        $route = get_option('mwb_msg91_route', '4');
        
        if (empty($authkey)) {
            return false;
        }
        
        $url = 'https://api.msg91.com/api/sendhttp.php';
        
        $data = array(
            'authkey' => $authkey,
            'mobiles' => $phone,
            'message' => $message,
            'sender' => $sender,
            'route' => $route
        );
        
        $response = wp_remote_post($url, array(
            'body' => $data,
            'timeout' => 30
        ));
        
        return !is_wp_error($response);
    }
    
    private function send_twilio_sms($phone, $message) {
        // Twilio SMS API integration
        $account_sid = get_option('mwb_twilio_account_sid', '');
        $auth_token = get_option('mwb_twilio_auth_token', '');
        $from_number = get_option('mwb_twilio_from_number', '');
        
        if (empty($account_sid) || empty($auth_token) || empty($from_number)) {
            return false;
        }
        
        $url = "https://api.twilio.com/2010-04-01/Accounts/{$account_sid}/Messages.json";
        
        $data = array(
            'From' => $from_number,
            'To' => $phone,
            'Body' => $message
        );
        
        $response = wp_remote_post($url, array(
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($account_sid . ':' . $auth_token)
            ),
            'body' => $data,
            'timeout' => 30
        ));
        
        return !is_wp_error($response);
    }
    
    // Booking reminder system
    public function send_visit_reminder($booking_id) {
        $booking = $this->database->get_booking($booking_id);
        
        if (!$booking || $booking->booking_status !== 'confirmed') {
            return false;
        }
        
        $visit_date = strtotime($booking->booking_date);
        $tomorrow = strtotime('+1 day');
        
        // Send reminder if visit is tomorrow
        if (date('Y-m-d', $visit_date) === date('Y-m-d', $tomorrow)) {
            $this->send_reminder_email($booking);
            $this->send_reminder_sms($booking);
            return true;
        }
        
        return false;
    }
    
    private function send_reminder_email($booking) {
        $to = $booking->customer_email;
        $subject = 'Marine World Visit Reminder - Tomorrow!';
        
        $message = sprintf(
            "Dear %s,\n\n" .
            "This is a friendly reminder that your Marine World visit is scheduled for tomorrow (%s).\n\n" .
            "Booking Details:\n" .
            "- Booking ID: %s\n" .
            "- Date: %s\n" .
            "- Tickets: %d\n" .
            "- QR Code: %s\n\n" .
            "Please remember to:\n" .
            "- Arrive 30 minutes before opening time\n" .
            "- Carry your QR code (attached)\n" .
            "- Bring valid ID proof\n\n" .
            "We look forward to welcoming you!\n\n" .
            "Best regards,\n" .
            "Marine World Team",
            $booking->customer_name,
            date('d/m/Y', strtotime($booking->booking_date)),
            $booking->booking_id,
            date('l, F j, Y', strtotime($booking->booking_date)),
            ($booking->general_tickets + $booking->child_tickets + $booking->senior_tickets),
            $booking->qr_code
        );
        
        wp_mail($to, $subject, $message);
    }
    
    private function send_reminder_sms($booking) {
        $phone = $booking->customer_phone;
        $message = sprintf(
            "Marine World Reminder: Your visit is tomorrow (%s). Booking ID: %s. Please bring QR code: %s. Arrive 30 mins early. Enjoy!",
            date('d/m/Y', strtotime($booking->booking_date)),
            $booking->booking_id,
            $booking->qr_code
        );
        
        // Use configured SMS service
        $this->send_confirmation_sms($booking);
    }
    
    // Schedule reminder emails via WP Cron
    public function schedule_visit_reminders() {
        // Get bookings for day after tomorrow
        $target_date = date('Y-m-d', strtotime('+2 days'));
        
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mwb_bookings';
        
        $bookings = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT booking_id FROM {$bookings_table} 
                 WHERE booking_date = %s 
                 AND booking_status = 'confirmed' 
                 AND payment_status = 'completed'",
                $target_date
            )
        );
        
        foreach ($bookings as $booking) {
            $this->send_visit_reminder($booking->booking_id);
        }
    }
}

// Schedule daily reminder check
if (!wp_next_scheduled('mwb_daily_reminders')) {
    wp_schedule_event(time(), 'daily', 'mwb_daily_reminders');
}

add_action('mwb_daily_reminders', function() {
    $notification_manager = new MWB_Notification_Manager();
    $notification_manager->schedule_visit_reminders();
});
?>