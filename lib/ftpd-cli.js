
'use strict';

var ftpd = require('ftpd'),
    _ = require('underscore');

var DIRECTORY_ARG = '--directory',
    DIRECTORY_ARG_SHORT = '-D',
    PORT_ARG = '--port',
    PORT_ARG_SHORT = '-P',
    USER_PASSWORD_ARG = '--user-password',
    USER_PASSWORD_ARG_SHORT = '-UP',
    VERSION_ARG = '--version',
    VERSION_ARG_SHORT = '-V',
    HELP_ARG = '--help',
    HELP_ARG_SHORT = '-HALP';

function parseArguments(args){
    var argsBook = { port: 21 };
    
    for(var i = 0 ; i < args.length ; i++){
        switch(args[i]){
            case DIRECTORY_ARG:
            case DIRECTORY_ARG_SHORT:
                if(++i < args.length){
                    argsBook.directory = args[i];
                }
                break;
            case PORT_ARG:
            case PORT_ARG_SHORT:
                if(++i < args.length){
                    argsBook.port = parseInt(args[i]);
                }
                break;
            case USER_PASSWORD_ARG:
            case USER_PASSWORD_ARG_SHORT:
                if(++i < args.length){
                    argsBook.users = [];
                    
                    var usrs = args[i].split(',');
                    _.each(usrs, function(u){
                        var login = u.split(':')[0],
                            password = u.split(':')[1];

                        argsBook.users.push({
                            login: login,
                            password: password
                        })
                    });
                }
                break;
            case VERSION_ARG:
            case VERSION_ARG_SHORT:
                argsBook.getVersion = true;
                break;
            case HELP_ARG:
            case HELP_ARG_SHORT:
                argsBook.getHelp = true;
                break;
        }
    }
    
    if(argsBook.getVersion){
        return console.log('ftpd-cli version: ' + require('./../package.json').version)
    } else if(argsBook.getHelp){
        return printHelp();
    }

    if(_.isUndefined(argsBook.directory)){
        return console.log('Directory must be given');
    }
    if(_.isUndefined(argsBook.port) || _.isNaN(argsBook.port)){
        return console.log('Port must be given and valid');
    }

    var server = new ftpd.FtpServer('0.0.0.0', {
        getInitialCwd: function() {
            return '/';
        },
        getRoot: function() {
            return argsBook.directory;
        },
        useWriteFile: true,
        useReadFile: true
    });

    server.on('error', function(error) {
        console.log('FTP Server error:', error);
    });

    server.on('client:connected', function(connection) {
        var username;
        console.log('client connected: ' + connection.remoteAddress);
        connection.on('command:user', function(user, success, failure) {
            if(user === 'anonymous'){
                if(_.isUndefined(argsBook.users) || argsBook.users.length === 0){
                    username = user;
                    success();
                } else {
                    failure();
                }
            } else {
                if(_.isUndefined(argsBook.users) || argsBook.users.length === 0){
                    failure();
                } else {
                    var userEntry = argsBook.users.find(function(e){ return e.login === user });
                    if(_.isUndefined(userEntry)){
                        failure();
                    } else {
                        username = userEntry;
                        success();
                    }
                }
            }
        });

        connection.on('command:pass', function(pass, success, failure) {
            if(_.isUndefined(argsBook.users) || argsBook.users.length === 0){
                success(username);
            } else {
                if(!_.isUndefined(username) && pass === username.password){
                    success(username.login);
                } else {
                    failure();
                }
            }
        });
    });

    server.debugging = 4;
    server.listen(argsBook.port);
    console.log('Listening on port ' + argsBook.port);
}

parseArguments(process.argv);

function printHelp(){
    console.log('Usage: ftpd-cli [options]');
    console.log('\nOptions:');
    console.log(' ' + VERSION_ARG_SHORT + ', ' + VERSION_ARG + '\t\tPrints image-sausage\'s version');
    console.log(' ' + HELP_ARG_SHORT + ', ' + HELP_ARG + '\t\tPrint this help');
    console.log(' ' + DIRECTORY_ARG_SHORT + ', ' + DIRECTORY_ARG + '\t\tSet root directory for ftp');
    console.log('\nOptional arguments:');
    console.log(' ' + PORT_ARG_SHORT + ', ' + PORT_ARG + '\t\tSet custom port (default: 21)');
    console.log(' ' + USER_PASSWORD_ARG_SHORT + ', ' + USER_PASSWORD_ARG + '\t\tList of users as user1:password1,user2:password2 (If not presented anonymous access is enabled)');
    console.log('\nMore info here: https://github.com/andrew-medvedev/ftpd-cli')
}