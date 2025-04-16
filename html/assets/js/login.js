const form = document.getElementById('login-form');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const password = document.getElementById('password').value;

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, password }),
            });

            if (res.ok) {
                // Optional: redirect to home or dashboard
                window.location.href = '/';
                console.log("logged in")
            } else {
                console.log('whoops')
                const err = await res.json();
                alert(err.error || 'Login failed.');
            }
        });