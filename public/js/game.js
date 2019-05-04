$(function () {
    var socket = io();

    // To prevent from displaying multiple times during server restarts
    socket.on('reconnect', () => {
        $('#messages').empty();
    });

    // Retrieve number of connected users
    socket.on('users connected', function (num_users_connected) {
        $('#users-connected').html("Users connected: " + num_users_connected);
    });

    // Retrieve messages from database upon entering chatroom
    socket.on('retrieve messages', function (msg) {
        $('#messages').append($('<li>').text(msg.username + ": " + msg.message));
    });

    $('form').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        if ($('#m').val() != '') {
            socket.emit('chat message', {
                username: currUser,
                msg: $('#m').val()
            });
        }
        $('#m').val('');
        return false;
    });

    // Display messages on screen
    socket.on('chat message', function (data) {
        $('#messages').append($('<li>').text(data.username + ": " + data.msg));
    });

    //message scroll
    function getMessages() {
        shouldScroll = messagesList.scollTop + messagesList.clientHeight === messagesList.scrollHeight;

        if (!shouldScroll) {
            scrollToBottom()
        }
    }

    function scrollToBottom() {
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    scrollToBottom();

    setInterval(getMessages, 100);
    //end of message scroll

    /* Begin chessboard configuration */
    var board,
        game,
        player1 = false,
        player2 = false,
        gameStart = true,
        game2 = new Chess(), // used for game history
        history,
        hist_index;

    var removeGreySquares = function () {
        $('#board .square-55d63').css('background', '');
    };

    var greySquare = function (square) {
        var squareEl = $('#board .square-' + square);

        var background = '#a9a9a9';
        if (squareEl.hasClass('black-3c85d') === true) {
            background = '#696969';
        }

        squareEl.css('background', background);
    };

    var onDragStart = function (source, piece) {
        // do not pick up pieces if the game is over
        // or if it's not that side's turn
        // or if P1 has created game and P2 has not joined
        if (game.game_over() === true ||
            (player2 === true && game.turn() === 'w') ||
            (player1 === true && game.turn() === 'b') ||
            (player1 === true && piece.search(/^b/) !== -1) ||
            (player2 === true && piece.search(/^w/) !== -1) ||
            gameStart == false) {
            return false;
        }
    };

    var onDrop = function (source, target) {
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

    var onMouseoverSquare = function (square, piece) {
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

    var onMouseoutSquare = function (square, piece) {
        removeGreySquares();
    };

    var onSnapEnd = function () {
        board.position(game.fen());
        socket.emit('playTurn', { gameID: gameID, fen: game.fen(), pgn: game.pgn(), turn: game.turn() });
        $('#userHello').remove();
        $('#gameStatus').html(checkGameStatus(game));
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


    /* Implementation of P2P functionality using sockets */

    /* Join user to the game with game ID from URL path */
    socket.emit('joinGame', { currUser: currUser, gameID: gameID });

    /**
     * Opponent joined the game, alert current user.
     * This event is received when opponent successfully joins the game. 
     */
    socket.on('oppJoined', function (data) {
        gameStart = true;
        var message = 'Your opponent, ' + data.oppName + ' has joined the match.';
        $('#userHello').html(message);
        $('#oppName').html(data.oppName);
        $('#gameStatus').html(checkGameStatus(game));
    });

    /**
     * Opponent rejoined the game, alert current user.
     * This event is received when opponent successfully rejoins the game. 
     */
    socket.on('oppRejoined', function (data) {
        var message = 'Your opponent, ' + data.oppName + ' has rejoined the match.';
        $('#userHello').html(message);
    });

    /**
     * Current user joined the game, render saved game state.
     * This event is received when current user successfully joins the game. 
     */
    socket.on('joinedGame', function (data) {
        var message;

        // Check if joining or rejoining game to display correct message
        if (!data.rejoin) {
            message = 'Hello, ' + currUser + ".";
        }
        else {
            message = 'Welcome back, ' + currUser + ".";
        }
        $('#userHello').html(message);

        gameID = data.gameID;
        game = new Chess(data.fen);

        if (data.pgn != null) {
            game.load_pgn(data.pgn);
        }

        cfg.position = data.fen;
        board = ChessBoard('board', cfg);

        game2.load_pgn(game.pgn());
        history = game2.history();
        hist_index = history.length;

        // Check if current user is P1
        if (data.player1 == currUser) {
            player1 = true;
            if (data.player2 == null) {
                // P1 has created new game
                $('#oppName').html('Waiting for an opponent to join...');
                gameStart = false;
            }
            else {
                $('#oppName').html(data.player2);
            }
        }
        // Check if current user is P2
        else {
            player2 = true;
            board.flip();
            $('#oppName').html(data.player1);
        }

        // Check game status
        $('#gameStatus').html(checkGameStatus(game));
    });

    /**
     * Opponent played his turn. Update UI.
     * Allow the current player to play now. 
     */
    socket.on('turnPlayed', function (data) {
        game.load(data.fen);
        game.load_pgn(data.pgn);
        board.position(data.fen);

        game2.load_pgn(game.pgn());
        history = game2.history();
        hist_index = history.length;

        // Check game status
        $('#gameStatus').html(checkGameStatus(game));
    });

    /**
     * If the other player wins or game is tied, this event is received. 
     * Notify the user about either scenario and end the game. 
     */
    socket.on('gameEnd', function (data) {
        socket.leave(data.gameID);
    })

    /**
     * Check who has the current move, and render the message. 
     */
    var checkMove = function (game) {
        if (gameStart == false) {
            return '';
        }
        else if ((player1 == true && game.turn() == 'w') || (player2 == true && game.turn() == 'b')) {
            return 'Your move!';
        }
        else {
            return 'Opponent\'s move.';
        }
    }

    /**
     * Check the game status, and render the result. 
     */
    var checkGameStatus = function () {
        var result;
        if (game.game_over() == true) {
            if (game.in_checkmate() == true) {
                if (game.turn() == 'b') {
                    result = 'Checkmate - Player 1 Won';
                    if (player1 == true) {
                        return 'Checkmate, you win!';
                    }
                    else {
                        return 'Checkmate, you lost!';
                    }
                }
                else {
                    result = 'Checkmate - Player 2 Won';
                    if (player2 == true) {
                        return 'Checkmate, you win!';
                    }
                    else {
                        return 'Checkmate, you lost!';
                    }
                }
            }
            // returns true if insufficient material or 50-move rule
            else if (game.in_draw() == true) {
                if (game.insufficient_material() == true) {
                    result = 'Draw - insufficient material';
                    return result;
                }
                else {
                    result = 'Draw - 50-move rule';
                    return result;
                }
            }
            else if (game.in_stalemate() == true) {
                result = 'Draw - stalemate';
                return result;
            }
            else if (game.in_threefold() == true) {
                result = 'Draw - threefold repetition';
                return result;
            }
            socket.emit('gameEnded', { gameID: gameID, result: result });
        }
        else {
            return checkMove(game);
        }
    }

    /**
     * Game history, previous move. 
     */
    $('#prevBtn5').on('click', function () {
        game2.undo();
        board.position(game2.fen());
        hist_index -= 1;
        if (hist_index < 0) {
            hist_index = 0;
        }
    });

    /**
     * Game history, next move. 
     */
    $('#nextBtn5').on('click', function () {
        game2.move(history[hist_index]);
        board.position(game2.fen());
        hist_index += 1;
        if (hist_index > history.length) {
            hist_index = history.length;
        }
    });

    /**
     * Game history, starting position of board. 
     */
    $('#startPositionBtn5').on('click', function () {
        game2.reset();
        board.start();
        hist_index = 0;
    });

    /**
     * Game history, current state of game. 
     */
    $('#endPositionBtn5').on('click', function () {
        game2.load_pgn(game.pgn());
        board.position(game2.fen());
        hist_index = history.length;
    });
});