const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());
app.use(cors());// Habilitar o CORS para todas as rotas
app.use(bodyParser.urlencoded({ extended: false }));

// Configuração da sessão
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Inicialização do Passport
app.use(passport.initialize());
app.use(passport.session());


// Dados de exemplo de usuários (simulação de banco de dados)
const users = [
    { id: 1, email: 'user1@example.com', password: 'password1' },
    { id: 2, email: 'user2@example.com', password: 'password2' },
    { id: 3, email: 'user3@example.com', password: 'password3' }
];

// Configuração da estratégia de autenticação local (usuário/senha)
passport.use(new LocalStrategy(
    {
      usernameField: 'email', // Campo de entrada para o email
      passwordField: 'password' // Campo de entrada para a senha
    },
    (email, password, done) => {
      // Verificar se o usuário existe na lista de usuários
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        return done(null, false, { message: 'Email ou senha incorretos' });
      }
      return done(null, user);
    }
  ));
  
  // Serialização do usuário para a sessão
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Desserialização do usuário a partir da sessão
  passport.deserializeUser((id, done) => {
    const user = users.find(u => u.id === id);
    done(null, user);
  });
  
  // Rota de login
  app.post('/login', passport.authenticate('local'), (req, res) => {
    // Gerar um token JWT
    const token = jwt.sign({ userId: req.user.id }, 'seu-segredo-secreto', { expiresIn: '1h' });

    // Enviar o token como parte da resposta
    res.json({ message: 'Login bem-sucedido', token });
  });
  
  // Rota protegida (exemplo)
  app.get('/profile', isAuthenticated, (req, res) => {
    res.json(req.user);
  });

// Rota para fazer logout
app.post('/logout', (req, res) => {
  // Limpar a sessão do usuário
  req.logout(() => {
      res.status(200).json({ message: 'Logout bem-sucedido' });
  });
});
  
  // Middleware para verificar se o usuário está autenticado
  function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Usuário não autenticado' });
  }


// Rota para registrar a chegada do funcionário
app.post('/registrar-chegada', async (req, res) => {
    const {idFuncionario} = req.body;
    const horarioChegada = new Date();
    const dataChegada = horarioChegada.toISOString().split('T')[0]; // Obtém a data no formato 'YYYY-MM-DD'
    const horaChegada = horarioChegada.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}); // Obtém a hora no formato 'HH:MM'

    try {
        // Abrir o arquivo Excel
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(path.resolve(__dirname, 'registro_chegadas.xlsx'));
        const worksheet = workbook.getWorksheet(1);

        // Adicionar uma nova linha com os dados do funcionário
        worksheet.addRow([idFuncionario, horarioChegada, horaChegada]);
        
        // Salvar o arquivo Excel
        await workbook.xlsx.writeFile(path.resolve(__dirname, 'registro_chegadas.xlsx'));

        // Responder com sucesso
        res.status(200).json({ message: 'Chegada registrada com sucesso.' });
    } catch (error) {
        // Se ocorrer um erro, responder com o código 500 (Erro interno do servidor)
        console.error('Erro ao escrever no arquivo Excel:', error);
        res.status(500).json({ error: 'Erro ao registrar a chegada.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
