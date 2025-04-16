const form = document.getElementById('signup-form');
        const userList = document.getElementById('user-list');

        // Submit signup form
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const password = document.getElementById('password').value;

            const res = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, password }),
            });

            if (res.ok) {
                form.reset();
                loadUsers(); // refresh user list
            } else {
                alert('Signup failed.');
            }
        });

        // Load users and show delete buttons
        async function loadUsers() {
            const res = await fetch('/api/users');
            const users = await res.json();

            userList.innerHTML = '';
            users.forEach(user => {
                const li = document.createElement('li');
                li.textContent = user.name + ' ';

                const deleteForm = document.createElement('form');
                deleteForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const confirmed = confirm(`Are you sure you want to delete ${user.name}?`);
                    if (!confirmed) return;

                    const res = await fetch('/delete-user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name: user.name }),
                    });

                    if (res.ok) {
                        loadUsers();
                    } else {
                        alert('Failed to delete user.');
                    }
                };

                const btn = document.createElement('button');
                btn.type = 'submit';
                btn.textContent = 'Delete';

                deleteForm.appendChild(btn);
                li.appendChild(deleteForm);
                userList.appendChild(li);
            });
        }

        loadUsers();