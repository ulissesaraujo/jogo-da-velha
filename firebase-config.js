// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD_fPui3UT7BCSqUlLzl3E5TDWFkTkkU2I",
    authDomain: "jogo-da-velha-usa.firebaseapp.com",
    databaseURL: "https://jogo-da-velha-usa-default-rtdb.firebaseio.com",
    projectId: "jogo-da-velha-usa",
    storageBucket: "jogo-da-velha-usa.firebasestorage.app",
    messagingSenderId: "371808043984",
    appId: "1:371808043984:web:88e772bae13b93b881efd5"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Referência ao banco de dados
const database = firebase.database();
