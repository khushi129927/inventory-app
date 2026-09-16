const bcrypt = require('bcrypt');
const db = require('../db');

async function seedAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];
  const role = process.argv[4] || 'creator';

  if (!username || !password) {
    console.error('Usage: node seedAdmin.js <username> <password> [role]');
    process.exit(1);
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username',
      [username, passwordHash, role]
    );

    console.log(`Successfully created ${role} user: ${result.rows[0].username} (ID: ${result.rows[0].id})`);
  } catch (err) {
    if (err.code === '23505') {
      console.error(`Error: Username '${username}' already exists.`);
    } else {
      console.error(`Error seeding ${role} user:`, err);
    }
    process.exit(1);
  } finally {
    process.exit();
  }
}

seedAdmin();
