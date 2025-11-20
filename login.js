// Wait for the DOM (the page) to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', function() {

    // Find the login form on the page
    const loginForm = document.querySelector('.login-form');

    // Make sure the form actually exists before adding a listener
    if (loginForm) {
        
        loginForm.addEventListener('submit', function(event) {
            
            // 1. Prevent the form from reloading the page
            event.preventDefault(); 

            // 2. Get the value from the role dropdown
            const roleSelect = document.getElementById('role');
            const role = roleSelect ? roleSelect.value : '';

            // 3. Decide where to redirect the user
            let destination = '';
            
            switch (role) {
                case 'admin':
                    destination = 'admin-dashboard.html';
                    break;
                case 'field':
                    destination = 'view-routes.html';
                    break;
                case 'cashier':
                    destination = 'cashier-dashboard.html';
                    break;
                case 'manager':
                    destination = 'manager-dashboard.html';
                    break;
                default:
                    // If they didn't select a role
                    // (Using a simple alert for this prototype)
                    alert('Please select a valid user role.');
                    return; // Stop the function here
            }

            // 4. Redirect to the correct page
            window.location.href = destination;
        });
    }
});
