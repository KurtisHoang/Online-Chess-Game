$(function () {
    var socket = io();
    // To prevent from displaying multiple times during server restarts
    socket.on('reconnect', () => {
        $('#users-connected').empty();
        $('#messages').empty();
    })
    // Retrieve number of connected users
    socket.on('users connected', function(num_users_connected){
        $('#users-connected').empty();
        $('#users-connected').append("Users connected: " + num_users_connected);
    });
    // Retrieve messages from database upon entering chatroom
    socket.on('retrieve messages', function(msg){
        $('#messages').append($('<li>').text(msg.user + ": " + msg.message));
    });
    $('form').submit(function(e){
        e.preventDefault(); // prevents page reloading
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });
    // Display messages on screen
    socket.on('chat message', function(msg){
        $('#messages').append($('<li>').text("User: " + msg));
    });

    
    var board, 
        game, 
        gameID,
        player1 = false, 
        player2 = false;

    var removeGreySquares = function() {
        $('#board .square-55d63').css('background', '');
    };
    
    var greySquare = function(square) {
        var squareEl = $('#board .square-' + square);
        
        var background = '#a9a9a9';
        if (squareEl.hasClass('black-3c85d') === true) {
            background = '#696969';
        }
        
        squareEl.css('background', background);
    };
    
    var onDragStart = function(source, piece) {
        // do not pick up pieces if the game is over
        // or if it's not that side's turn
        if (game.game_over() === true ||
            (player2 === true && game.turn() === 'w') ||
            (player1 === true && game.turn() === 'b') ||
            (player1 === true && piece.search(/^b/) !== -1) ||
            (player2 === true && piece.search(/^w/) !== -1) ) {
            return false;
        }
    };
    
    var onDrop = function(source, target) {
        removeGreySquares();
        
        // see if the move is legal
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q' // NOTE: always promote to a queen for example simplicity
        });
        
        // illegal move
        if (move === null) return 'snapback';
    };
    
    var onMouseoverSquare = function(square, piece) {
        // get list of possible moves for this square
        var moves = game.moves({
            square: square,
            verbose: true
        });
        
        // exit if there are no moves available for this square
        if (moves.length === 0) return;
        
        // highlight the square they moused over
        greySquare(square);
        
        // highlight the possible squares for this piece
        for (var i = 0; i < moves.length; i++) {
            greySquare(moves[i].to);
        }
    };
    
    var onMouseoutSquare = function(square, piece) {
        removeGreySquares();
    };
    
    var onSnapEnd = function() {
        board.position(game.fen());
        socket.emit('playTurn', {gameID: gameID, fen: game.fen()});
        var message = 'Waiting for opponent...';
        $('#move').html(message);
    };
    
    var cfg = {
        showNotation: false,
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        //onMouseoutSquare: onMouseoutSquare,
        //onMouseoverSquare: onMouseoverSquare,
        onSnapEnd: onSnapEnd
    };

    /**
     * Create a new game. Emit newGame event.
     */
    $('#new').on('click', function(){
        var name = $('#nameNew').val();
        if(!name){
            alert('Please enter your name.');
            return;
        }
        socket.emit('createGame', {name: name});
    });

    /** 
     *  Join an existing game on the entered roomId. Emit the joinGame event.
     */ 
    $('#join').on('click', function(){
        var name = $('#nameJoin').val();
        var roomID = $('#room').val();
        if(!name || !roomID){
            alert('Please enter your name and game ID.');
            return;
        }
        socket.emit('joinGame', {name: name, room: roomID});
    });

    /** 
     * New Game created by current client. 
     * Update the UI and create new game.
     */
    socket.on('newGame', function(data){
        var message = 'Hello, ' + data.name;
        $('#userHello').html(message);
        message = 'Your move!';
        $('#move').html(message);
        
        // Create game for player 1
        game = new Chess(data.fen);	
        board = ChessBoard('board', cfg);
        gameID = data.gameID;
        player1 = true;
    });
    
    /**
     * P2 joined the game, alert P1.
     * This event is received when P2 successfully joins the game room. 
     */
    socket.on('player1', function(data){		
        var message = 'Your opponent, ' + data.name + ' has joined the match.';
        $('#userHello').html(message);
    });
    
    /**
     * P2 joined the game, render game/chessboard started by P1.
     * This event is received when P2 successfully joins the game room. 
     */
    socket.on('player2', function(data){
        var message = 'Hello, ' + data.name;
        $('#userHello').html(message);
        message = 'Waiting for opponent...';
        $('#move').html(message);
    
        //Create game for player 2
        game = new Chess(data.fen);
        board = ChessBoard('board', cfg);
        board.flip();
        gameID = data.gameID;
        player2 = true;
    });	
    
    /**
     * Opponent played his turn. Update UI.
     * Allow the current player to play now. 
     */
    socket.on('turnPlayed', function(data){
        game.load(data.fen);
        board.position(data.fen);
        var message = 'Your move!';
        $('#move').html(message);
    });

    


    /*$('#setRuyLopezBtn').on('click', function() {
        var ruyLopez = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
        game.load(ruyLopez);
        board.position(game.fen());
    });*/
});