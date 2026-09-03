const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  // Cria a janela do navegador.
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "NortecOS",
    autoHideMenuBar: true, // Esconde aquela barra de "Arquivo, Editar, Exibir"
    icon: path.join(__dirname, 'icon.ico'), // Opcional: Adicionar um ícone depois
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Carrega o arquivo HTML do sistema
  win.loadFile('nortec_os.html');
  
  // Abre o aplicativo já maximizado
  win.maximize();
}

// Quando o sistema estiver pronto, abre a janela
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Fecha o aplicativo quando todas as janelas forem fechadas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});