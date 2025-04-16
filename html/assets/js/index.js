
// WebSocket to listen for new meal notifications
const ws = new WebSocket("ws://" + window.location.host);

ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'new_meal') {
        loadMeals(); // Refresh only the meals section
    }
};

// Handle logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    const res = await fetch('/logout', { method: 'POST' });
    if (res.ok) {
        window.location.href = '/login';
    } else {
        alert('Logout failed.');
    }
});

// Handle new meal submission
document.getElementById('meal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.Meal.value;
    const cal = parseInt(form.Cal.value, 10);

    const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cal })
    });

    if (res.ok) {
        form.reset();
        loadMeals(); // Refresh list
    } else {
        alert('Failed to add meal.');
    }
});

// Load meals for current user
async function loadMeals() {
    const res = await fetch('/api/meals', {
        credentials: 'include'  // Ensure cookies are sent with the request
    });
    if (!res.ok) {
        if (res.status === 401) {
            alert('You must be logged in.');
            window.location.href = '/login'; // Redirect to login page
        } else {
            console.log(res.status);
            alert('An error occurred. Please try again.');
        }
        return;
    }

    const data = await res.json();
    const mealList = document.getElementById('meal-list');
    const totalCalories = document.getElementById('total-calories');
    const welcome = document.getElementById('welcome-user');

    mealList.innerHTML = '';
    let total = 0;

    data.forEach(meal => {
        const li = document.createElement('li');
        li.textContent = `${meal.name} - ${meal.cal} cal`;
        mealList.appendChild(li);
        total += meal.cal;
    });

    totalCalories.textContent = total;
    welcome.textContent = 'Welcome ' + (data[0]?.user || '');
}

loadMeals();