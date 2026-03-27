import express, { Request, Response } from 'express';
import axios from 'axios';
import bcrypt from 'bcryptjs';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// A simple root route to confirm the server is running
app.get('/', (req: Request, res: Response) => {
  res.send('Backend server is running!');
});

// Login endpoint
app.post('/api/login', async (req: Request, res: Response) => {
  const { cpf, matricula, password } = req.body;

  if ((!cpf && !matricula) || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const response = await axios.get('https://n8n-datalakepcr.recife.pe.gov.br/webhook/getusuarios');
    const users = response.data;

    const user = users.find((u: any) => (cpf && u.cpf === cpf) || (matricula && u.matricula === matricula));

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.senha_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Return success without the hash
    const { senha_hash, ...userWithoutHash } = user;
    res.json({ user: userWithoutHash });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
