let currentUserRole = null;

// Get logged-in user info first
async function getCurrentUser() {
    const res = await fetch('http://localhost:3000/me', { credentials: 'include' });
    if (res.ok) {
        const user = await res.json();
        currentUserRole = user.role;
    }
}

document.getElementById('userPermissionLink').addEventListener('click', async (e) => {
    e.preventDefault();
    await getCurrentUser(); // Ensure we know the role before loading

    document.getElementById('mainContent').innerHTML = `
        <h2>User Permissions</h2>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Add Stock</th>
                    <th>View Stock</th>
                    <th>Edit Stock</th>
                    <th>Delete Stock</th>
                    ${currentUserRole === 'master' ? '<th>Action</th>' : ''}
                </tr>
            </thead>
            <tbody id="permissionTable">
                <tr><td colspan="6">Loading...</td></tr>
            </tbody>
        </table>
    `;

    const res = await fetch('http://localhost:3000/users', { credentials: 'include' });
    if (res.ok) {
        const users = await res.json();
        const table = document.getElementById('permissionTable');
        table.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td><input type="checkbox" id="add-${user.id}" ${user.can_add_stock ? 'checked' : ''} ${currentUserRole !== 'master' ? 'disabled' : ''}></td>
                <td><input type="checkbox" id="view-${user.id}" ${user.can_view_stock ? 'checked' : ''} ${currentUserRole !== 'master' ? 'disabled' : ''}></td>
                <td><input type="checkbox" id="edit-${user.id}" ${user.can_edit_stock ? 'checked' : ''} ${currentUserRole !== 'master' ? 'disabled' : ''}></td>
                <td><input type="checkbox" id="delete-${user.id}" ${user.can_delete_stock ? 'checked' : ''} ${currentUserRole !== 'master' ? 'disabled' : ''}></td>
                ${currentUserRole === 'master' ? `<td>
                    <button class="btn btn-primary btn-sm" onclick="updatePermissions(${user.id})">Save</button>
                </td>` : ''}
            `;
            table.appendChild(tr);
        });
    }
});

async function updatePermissions(id) {
    const data = {
        can_add_stock: document.getElementById(`add-${id}`).checked,
        can_view_stock: document.getElementById(`view-${id}`).checked,
        can_edit_stock: document.getElementById(`edit-${id}`).checked,
        can_delete_stock: document.getElementById(`delete-${id}`).checked
    };

    const res = await fetch(`http://localhost:3000/users/${id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });

    alert(await res.text());
}