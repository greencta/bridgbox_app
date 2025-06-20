<?php
// Set the content type to JSON so the frontend knows how to parse the response
header('Content-Type: application/json');

// This is the correct 4-digit code.
// In a real-world application, this might come from a database or a secure config file.
$correct_pin = '2327';

// Initialize the response array
$response = [
    'status' => 'error',
    'message' => 'Invalid request.'
];

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the submitted PIN from the request body
    $data = json_decode(file_get_contents('php://input'), true);
    $submitted_pin = isset($data['pin']) ? $data['pin'] : '';

    if (empty($submitted_pin) || strlen($submitted_pin) !== 4) {
        $response['message'] = 'Please enter a valid 4-digit code.';
    } else {
        // Check if the submitted PIN matches the correct one
        if ($submitted_pin === $correct_pin) {
            $response['status'] = 'success';
            $response['message'] = 'Authentication successful.';
        } else {
            $response['message'] = 'Invalid code. Please try again.';
        }
    }
}

// Send the JSON response back to the frontend
echo json_encode($response);
?>
