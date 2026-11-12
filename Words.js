'use strict';
// Banco de palavras. Para adicionar uma palavra, inclua uma linha na categoria desejada:
//   "Nome;dificuldade (1 fácil, 2 médio, 3 difícil);dica curta;apelido1,apelido2"
// O apelido é opcional. Maiúsculas, acentos, espaços e hífens são ignorados na comparação.
// O identificador (id) é gerado a partir do nome, por exemplo "guarda-chuva".
// O desenho da palavra deve existir em Data/Drawings.js com o mesmo id.
const RAW = {
    "Animais": [
        "Girafa;1;Tem o pescoço bem comprido",
        "Gato;1;Mia e adora leite",
        "Elefante;1;Tem tromba e presas",
        "Coruja;2;Ave que enxerga bem à noite",
        "Cachorro;1;O melhor amigo do homem;cao",
        "Leão;1;O rei da selva",
        "Pinguim;2;Ave que não voa e vive no gelo",
        "Tartaruga;2;Carrega a casa nas costas;jabuti",
        "Borboleta;2;Inseto colorido que vem de uma lagarta",
        "Cavalo;1;Corre muito e tem crina",
        "Macaco;1;Adora banana;mico",
        "Tubarão;2;Predador do mar com nadadeira no dorso",
        "Polvo;3;Tem oito tentáculos",
        "Coelho;1;Orelhas longas e adora cenoura",
        "Cobra;2;Rasteja e não tem patas;serpente",
        "Aranha;2;Tece teias e tem oito patas"
    ],
    "Comidas": [
        "Pizza;1;Redonda, com queijo e fatias",
        "Hambúrguer;1;Pão, carne e queijo;hamburger",
        "Bolo;1;Tem velinhas no aniversário",
        "Pipoca;1;Estoura no cinema",
        "Cachorro-quente;2;Salsicha no pão;hot dog,hotdog",
        "Ovo;1;Sai da galinha",
        "Queijo;1;Feito de leite, amarelo e fatiado",
        "Pão;1;Assado na padaria"
    ],
    "Frutas": [
        "Banana;1;Fruta amarela",
        "Melancia;2;Verde por fora e vermelha por dentro",
        "Abacaxi;2;Fruta com coroa de folhas",
        "Morango;2;Fruta vermelha cheia de sementinhas",
        "Uva;1;Cresce em cachos",
        "Laranja;1;Fruta cítrica de onde sai suco"
    ],
    "Sobremesas": [
        "Sorvete;1;Gelado, vem na casquinha;sorvete de casquinha",
        "Pudim;2;Doce de leite com calda de caramelo",
        "Donut;2;Rosquinha doce com furo no meio;rosquinha,rosca",
        "Picolé;1;Gelado no palito;picole"
    ],
    "Bebidas": [
        "Café;1;Bebida quente que dá energia",
        "Suco;1;Feito de frutas",
        "Leite;1;Bebida branca que vem da vaca",
        "Refrigerante;2;Bebida com gás;refri",
        "Chá;1;Bebida de ervas, geralmente quente",
        "Água de Coco;2;Bebida natural de dentro de uma fruta",
        "Vitamina;2;Frutas batidas com leite",
        "Milkshake;2;Bebida cremosa e gelada"
    ],
    "Objetos": [
        "Foguete;2;Viaja para o espaço",
        "Relógio;1;Mostra as horas",
        "Guarda-chuva;2;Protege da chuva",
        "Espelho;2;Mostra o seu reflexo",
        "Óculos;1;Ajuda a enxergar",
        "Chave;1;Abre portas",
        "Vela;2;Derrete enquanto ilumina",
        "Balão;1;Enche de ar e voa",
        "Lupa;2;Aumenta o que vemos",
        "Mala;1;Usada em viagens",
        "Tesoura;1;Corta papel",
        "Lâmpada;1;Acende a luz"
    ],
    "Profissões": [
        "Bombeiro;1;Apaga incêndios",
        "Médico;1;Cuida da saúde;doutor",
        "Professor;1;Ensina na escola;professora",
        "Astronauta;2;Viaja pelo espaço",
        "Cozinheiro;2;Prepara refeições;chef",
        "Policial;1;Protege a cidade",
        "Pintor;2;Usa tinta e pincel",
        "Piloto;2;Conduz aviões",
        "Fazendeiro;2;Cuida de plantações e animais;agricultor"
    ],
    "Veículos": [
        "Helicóptero;2;Voa com hélices no teto",
        "Carro;1;Tem quatro rodas",
        "Avião;1;Voa com asas",
        "Submarino;2;Navega debaixo d'água",
        "Bicicleta;1;Duas rodas e pedais;bike",
        "Moto;1;Duas rodas e motor;motocicleta",
        "Trem;1;Anda sobre trilhos",
        "Navio;1;Atravessa os oceanos",
        "Ônibus;1;Transporta muita gente",
        "Caminhão;2;Carrega cargas pesadas"
    ],
    "Transportes": [
        "Metrô;2;Trem que corre debaixo da cidade",
        "Teleférico;3;Cabine pendurada num cabo",
        "Patinete;1;Em pé e com guidão",
        "Skate;1;Prancha com quatro rodinhas",
        "Balsa;3;Atravessa rios levando carros",
        "Charrete;3;Puxada por cavalos"
    ],
    "Lugares": [
        "Escola;1;Onde se estuda",
        "Hospital;1;Onde se cuida dos doentes",
        "Castelo;2;Casa de reis e rainhas",
        "Praia;1;Areia e mar",
        "Farol;2;Torre que guia os navios",
        "Pirâmide;2;Monumento do Egito",
        "Circo;2;Tem palhaços e trapezistas",
        "Biblioteca;2;Cheia de livros"
    ],
    "Natureza": [
        "Sol;1;Estrela que ilumina o dia",
        "Lua;1;Brilha no céu à noite",
        "Arco-íris;1;Aparece depois da chuva com sete cores;arco iris",
        "Vulcão;2;Montanha que expele lava",
        "Cachoeira;2;Queda d'água",
        "Árvore;1;Tem tronco, galhos e folhas",
        "Montanha;1;Bem alta e cheia de pedras",
        "Flor;1;Colorida e perfumada",
        "Nuvem;1;Flutua no céu",
        "Raio;2;Clarão que acompanha o trovão",
        "Cogumelo;2;Tem chapéu e cresce no chão úmido",
        "Cacto;2;Planta do deserto cheia de espinhos"
    ],
    "Tecnologia": [
        "Celular;1;Usamos para ligar e navegar;smartphone,telefone",
        "Computador;1;Tem tela e teclado;pc",
        "Robô;2;Máquina que imita ações humanas",
        "Fone de Ouvido;2;Usado para ouvir música;fone,headphone",
        "Teclado;1;Cheio de teclas",
        "Mouse;1;Aponta e clica",
        "Câmera;2;Tira fotos",
        "Drone;2;Voa controlado a distância",
        "Impressora;2;Coloca no papel o que está na tela"
    ],
    "Esportes": [
        "Futebol;1;Chute na bola",
        "Basquete;1;Cesta e quadra;basquetebol",
        "Natação;2;Esporte na piscina",
        "Tênis;2;Raquete e rede;tenis de quadra",
        "Surfe;2;Pegar onda;surf",
        "Boxe;2;Luvas e ringue",
        "Vôlei;2;Rede e bola por cima;volei,voleibol",
        "Golfe;3;Tacada em buraquinhos"
    ],
    "Instrumentos Musicais": [
        "Violão;1;Seis cordas",
        "Piano;1;Teclas pretas e brancas",
        "Bateria;2;Pratos, tambores e baquetas",
        "Guitarra;2;Instrumento elétrico de cordas",
        "Violino;2;Tocado com arco",
        "Flauta;2;Instrumento de sopro",
        "Tambor;1;Bate-se com baquetas",
        "Sanfona;3;Abre e fecha tocando;acordeon,acordeao"
    ],
    "Ferramentas": [
        "Martelo;1;Bate pregos",
        "Serra;2;Corta madeira",
        "Chave de Fenda;2;Gira parafusos;chave-de-fenda",
        "Alicate;2;Aperta e corta arames",
        "Furadeira;3;Faz buracos na parede",
        "Pá;1;Usada para cavar",
        "Escada;1;Sobe degrau por degrau",
        "Machado;2;Corta lenha"
    ],
    "Roupas": [
        "Camiseta;1;Veste o tronco;camisa",
        "Boné;1;Protege do sol com aba",
        "Meia;1;Vai dentro do sapato",
        "Vestido;1;Peça única, comum em festas",
        "Chapéu;1;Vai na cabeça",
        "Sapato;1;Calça os pés",
        "Casaco;1;Aquece no frio",
        "Gravata;2;Fica no pescoço com camisa social"
    ],
    "Móveis": [
        "Cadeira;1;Serve para sentar",
        "Mesa;1;Tem quatro pés e um tampo",
        "Sofá;1;Assento grande da sala",
        "Cama;1;Onde se dorme",
        "Guarda-roupa;2;Guarda as roupas;armario",
        "Estante;2;Guarda os livros",
        "Abajur;3;Luminária de mesa",
        "Berço;2;Cama de bebê"
    ],
    "Eletrodomésticos": [
        "Geladeira;1;Mantém a comida gelada;refrigerador",
        "Ventilador;1;Gira para refrescar",
        "Micro-ondas;2;Esquenta a comida rápido;microondas",
        "Liquidificador;2;Bate vitaminas",
        "Televisão;1;Mostra programas e filmes;tv",
        "Fogão;1;Onde se cozinha",
        "Aspirador de Pó;3;Suga a sujeira;aspirador",
        "Ferro de Passar;2;Alisa as roupas;ferro",
        "Torradeira;3;Deixa o pão crocante"
    ],
    "Personagens Fictícios": [
        "Papai Noel;1;Entrega presentes no Natal",
        "Sereia;2;Metade mulher, metade peixe",
        "Dragão;2;Voa e solta fogo",
        "Fantasma;1;Assombra e usa lençol",
        "Bruxa;1;Voa de vassoura",
        "Vampiro;2;Tem presas e capa",
        "Pirata;1;Tapa-olho e tesouro",
        "Unicórnio;2;Cavalo com chifre mágico",
        "Fada;2;Pequena, com asas e varinha",
        "Pinóquio;2;Nariz que cresce quando mente"
    ],
    "Filmes": [
        "Titanic;2;Navio, iceberg e romance",
        "Jurassic Park;3;Dinossauros recriados em um parque;jurassicpark",
        "King Kong;2;Gorila gigante",
        "Harry Potter;2;Bruxo de óculos e cicatriz",
        "Shrek;2;Ogro verde",
        "Frozen;2;Princesa que cria gelo",
        "Toy Story;2;Brinquedos que ganham vida"
    ],
    "Desenhos Animados": [
        "Bob Esponja;2;Esponja amarela que mora no fundo do mar;bobesponja",
        "Os Simpsons;2;Família amarela de Springfield;simpsons",
        "Tom e Jerry;2;Gato e rato que vivem brigando;tom jerry,tom & jerry",
        "Pica-Pau;3;Pássaro de topete e risada famosa;picapau",
        "Turma da Mônica;2;Menina de vestido vermelho e coelhinho de pelúcia;monica",
        "Pokémon;2;Monstrinhos de bolso;pokemon",
        "Scooby-Doo;2;Cachorro medroso e detetive;scooby doo,scooby"
    ],
    "Jogos": [
        "Minecraft;2;Mundo feito de blocos",
        "Pac-Man;2;Come bolinhas fugindo de fantasmas;pacman",
        "Xadrez;1;Rei, rainha e peões",
        "Tetris;2;Blocos que caem e se encaixam",
        "Super Mario;2;Encanador de boné vermelho;mario",
        "Among Us;2;Tripulantes e impostor;amongus",
        "Dominó;2;Peças com pontinhos;domino",
        "Baralho;1;Cartas de jogar",
        "Roblox;3;Plataforma de mundos criados por jogadores"
    ],
    "Marcas": [
        "Coca-Cola;2;Refrigerante vermelho famoso;cocacola,coca cola,coca",
        "Nike;2;Marca esportiva com um símbolo curvo",
        "McDonald's;2;Lanchonete do M amarelo;mcdonalds,mc donalds,mc",
        "Apple;2;Marca da maçã mordida;apple",
        "YouTube;2;Plataforma de vídeos com botão de play vermelho;you tube",
        "Lego;2;Blocos de montar coloridos"
    ],
    "Produtos": [
        "Shampoo;2;Lava o cabelo",
        "Sabonete;1;Lava as mãos e o corpo",
        "Escova de Dentes;1;Limpa os dentes;escova de dente",
        "Pasta de Dente;2;Creme dental;creme dental",
        "Perfume;2;Líquido cheiroso em frasco",
        "Esponja;2;Lava a louça",
        "Pilha;2;Dá energia a controles e brinquedos"
    ],
    "Coisas do Cotidiano": [
        "Toalha;1;Seca o corpo",
        "Copo;1;Serve para beber",
        "Garrafa;1;Guarda líquidos",
        "Prato;1;Onde se coloca a comida",
        "Colher;1;Para tomar sopa",
        "Garfo;1;Tem pontas para espetar",
        "Panela;1;Vai ao fogo",
        "Mochila;1;Carregada nas costas",
        "Caderno;1;Para escrever na escola",
        "Lápis;1;Escreve e tem borracha",
        "Despertador;2;Toca de manhã;alarme",
        "Porta;1;Entrada de um cômodo",
        "Janela;1;Deixa a luz entrar"
    ]
};

const DIFFICULTY = { 1: 'facil', 2: 'medio', 3: 'dificil' };

function slugify(text) {
    return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parse() {
    const list = [];
    const seen = new Set();
    for (const [category, rows] of Object.entries(RAW)) {
        for (const row of rows) {
            const [word, diff, hint, aliases] = row.split(';');
            const id = slugify(word);
            if (seen.has(id)) throw new Error(`Palavra duplicada no banco: ${word}`);
            seen.add(id);
            list.push({
                id,
                word: word.trim(),
                category,
                aliases: aliases ? aliases.split(',').map(a => a.trim()).filter(Boolean) : [],
                difficulty: DIFFICULTY[Number(diff)] || 'medio',
                hint: (hint || '').trim(),
                drawing: id
            });
        }
    }
    return list;
}

const words = parse();
const categories = [...new Set(words.map(w => w.category))];

module.exports = { words, categories, slugify };
