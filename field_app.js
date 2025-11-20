// This file controls the frontend logic for the Field Officer pages.
// It is separate from the admin 'app.js' file.

const API_BASE_URL = 'http://localhost:3000'; // Make sure this matches your server.js

// This function runs when the page is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // Check which page we are on
    const routeListPage = document.getElementById('route-list-container');
    const readingFormPage = document.getElementById('reading-form');

    if (routeListPage) {
        // We are on the 'view-routes.html' page
        initRoutesPage(routeListPage);
    } else if (readingFormPage) {
        // We are on the 'enter-reading.html' page
        initReadingPage(readingFormPage);
    }
});

/**
 * PAGE 1: VIEW-ROUTES.HTML
 * Fetches all assigned routes and builds the list of job cards.
 */
/**
 * PAGE 1: VIEW-ROUTES.HTML
 * Fetches all assigned routes and builds the list of job cards.
 */
async function initRoutesPage(container) {
    container.innerHTML = '<p class="loading-message">Loading assigned routes...</p>';

    try {
        // Call the API endpoint from server.js
        const response = await fetch(`${API_BASE_URL}/getRoutes`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            container.innerHTML = ''; // Clear loading message
            
            result.data.forEach(route => {
                // --- FIX: Create a 'div' instead of an 'a' ---
                const card = document.createElement('div');
                card.className = 'job-card';

                // --- FIX: Populate card, making ONLY the button a link ---
                card.innerHTML = `
                    <h3>${route.CustomerName}</h3>
                    <p>${route.ServiceAddress}</p>
                    <p class="meter-id">Meter ID: ${route.MeterID}</p>
                    <a href="enter-reading.html?meterId=${route.MeterID}" class="start-reading-btn">Start Reading</a>
                `;
                container.appendChild(card);
            });

        } else if (result.success && result.data.length === 0) {
            container.innerHTML = '<p class="loading-message">All readings for this month are complete!</p>';
        } else {
            container.innerHTML = `<p class="error-message">Error: ${result.message}</p>`;
        }
    } catch (error) {
        console.error('Failed to fetch routes:', error);
        container.innerHTML = `<p class="error-message">Failed to load data. Is the server running?</p>`;
    }
}


/**
 * PAGE 2: ENTER-READING.HTML
 * Loads the specific meter details and handles the form submission.
 */
async function initReadingPage(formElement) {
    // Get the meterId from the URL (e.g., ?meterId=MTR-E-001)
    const params = new URLSearchParams(window.location.search);
    const meterId = params.get('meterId');

    if (!meterId) {
        document.body.innerHTML = '<p class="error-message">Error: No Meter ID provided.</p>';
        return;
    }

    // --- 1. Fetch and Pre-fill Customer Details ---
    try {
        const response = await fetch(`${API_BASE_URL}/api/meter-details/${meterId}`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            // Find the spans by ID and fill them with data
            document.getElementById('customer-name').textContent = data.CustomerName;
            document.getElementById('customer-address').textContent = data.ServiceAddress;
            document.getElementById('customer-meter-id').textContent = data.MeterID;
            
            // Also fill the hidden 'meter-id' input for submission
            document.getElementById('meter-id-hidden').value = data.MeterID;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Failed to fetch meter details:', error);
        document.querySelector('.customer-info').innerHTML = `<p class="error-message">Error loading customer data.</p>`;
    }

    // --- 2. Set Reading Date to Today by Default ---
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reading-date').value = today;

    // --- 3. Add Submit Event Listener ---
    formElement.addEventListener('submit', handleReadingSubmit);
}

/**
 * Handles the submission of the new meter reading.
 */
async function handleReadingSubmit(event) {
    event.preventDefault(); // Stop the form from reloading the page
    
    const form = event.target;
    const submitButton = document.querySelector('.submit-button');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    // Get the data from the form
    const formData = {
        'meter-id': form.querySelector('#meter-id-hidden').value,
        'reading-value': form.querySelector('#reading-value').value,
        'reading-date': form.querySelector('#reading-date').value,
        'notes': form.querySelector('#notes').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/submitReading`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            submitButton.textContent = 'Submitted!';
            // Redirect back to the route list after 2 seconds
            setTimeout(() => {
                window.location.href = 'view-routes.html';
            }, 2000);
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        console.error('Failed to submit reading:', error);
        alert(`Error: ${error.message}`); // Show a simple error
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Reading';
    }
}
