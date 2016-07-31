
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
    HELP_ARG_SHORT = '-HELP',
    DONT_DAEMONIZE_ARG = '--dont-daemonize',
    DONT_DAEMONIZE_ARG_SHORT = '-DD',
    STOP_DAEMON_ARG = '--stop',
    STOP_DAEMON_ARG_SHORT = '-S';

var ARG_TYPOS = {
    
};

function checkArgs(){
    return true;
}

function tryDaemonizeThis(){
    var FTPD_PID_FILENAME = 'ftpd_pid';

    for(var i = 0 ; i < process.argv.length ; i++){
        if(process.argv[i] === DONT_DAEMONIZE_ARG ||
                process.argv[i] === DONT_DAEMONIZE_ARG_SHORT ||
                process.argv[i] === HELP_ARG ||
                process.argv[i] === HELP_ARG_SHORT ||
                process.argv[i] === VERSION_ARG ||
                process.argv[i] === VERSION_ARG_SHORT){

            return false;
        } else if(process.argv[i] === STOP_DAEMON_ARG || process.argv[i] === STOP_DAEMON_ARG_SHORT){
            var read = require('read-file'),
                del = require('delete');

            console.log('Reading daemon PID...');
            var pid;

            try{
                pid = read.sync(FTPD_PID_FILENAME, 'utf8');
            } catch(err){
                console.error(err);
                return true;
            }

            console.log('Reading daemon PID... OK');
            console.log('Daemon process PID is '+ pid);

            console.log('Trying to stop daemon...');

            try{
                process.kill(pid);
            } catch(err){
                console.error(err);
                return true;
            }
            del.sync(FTPD_PID_FILENAME);

            console.log('Trying to stop daemon... OK');
            
            return true;
        }
    }

    var child_process = require('child_process'),
        path = require('path'),
        write = require('write');

    console.log('Spawning daemon process...');
    
    var child;

    try{
        var process_opts = {
            stdio: ['ignore', 'ignore', 'ignore'],
            cwd: process.cwd(),
            env: process.env,
            detached: true
        };

        child = child_process.spawn(
            process.execPath,
            process.argv.slice(1).concat([DONT_DAEMONIZE_ARG_SHORT]),
            process_opts
        );

        write.sync(FTPD_PID_FILENAME, child.pid);
        child.unref();
    } catch(err){
        console.error(err);
        return true;
    }

    console.log('Spawning daemon process... [OK]');
    console.log('Daemon process PID is '+ child.pid);

    return true;
}

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
        var thisPackage = require('./../package.json');
        return console.log(thisPackage.name + ' version: ' + thisPackage.version)
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

if(checkArgs()){
    if(!tryDaemonizeThis()){
        parseArguments(process.argv);
    } else {
        process.exit();
    }
}

function printHelp(){
    console.log('Usage: ftpd-cli [options]');
    console.log('\nOptions:');
    console.log(' ' + VERSION_ARG_SHORT + ', ' + VERSION_ARG + '\t\tPrints image-sausage\'s version');
    console.log(' ' + HELP_ARG_SHORT + ', ' + HELP_ARG + '\t\tPrint this help');
    console.log(' ' + DIRECTORY_ARG_SHORT + ', ' + DIRECTORY_ARG + '\t\tSet root directory for ftp');
    console.log('\nOptional arguments:');
    console.log(' ' + PORT_ARG_SHORT + ', ' + PORT_ARG + '\t\tSet custom port (default: 21)');
    console.log(' ' + USER_PASSWORD_ARG_SHORT + ', ' + USER_PASSWORD_ARG + '\t\tList of users as user1:password1,user2:password2 (If not presented anonymous access is enabled)');
    console.log(' ' + STOP_DAEMON_ARG_SHORT + ', ' + STOP_DAEMON_ARG + '\t\tSignal to stop ftpd-cli daemon');
    console.log(' ' + DONT_DAEMONIZE_ARG_SHORT + ', ' + DONT_DAEMONIZE_ARG_ARG + '\t\tDo not daemonize');
    console.log('\nMore info here: https://github.com/andrew-medvedev/ftpd-cli')
}