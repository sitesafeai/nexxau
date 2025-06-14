async function createAdmin() {
  try {
    const response = await fetch('http://localhost:3002/api/auth/create-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'lmcarneiro21@gmail.com',
        password: 'Flamengo10',
      }),
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

createAdmin(); 