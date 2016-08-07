# Truly simple zero-config 5-sec FTP server in pure JavaScript

`ftpd-cli` is a simple and zero-config ftp server daemon
that will help you if your boss wants ftp access right now.

![FTP](http://technotree.ru/wp-content/uploads/2015/02/ftp_made_simple-main.jpg)

Based on this npm [module](https://www.npmjs.com/package/ftpd).

## Install it globally

```bash
npm install -g ftpd-cli
```

## Usage

To start ftp daemon with anonymous access:
```bash
ftpd-cli --directory path/to/files
```

To start ftp daemon with login-passwords only:
```bash
ftpd-cli --directory path/to/files --user-password login:322
```

To stop daemon:
```bash
ftpd-cli --stop
```

## Available options

```bash
ftpd-cli --help
```

```bash
Usage: ftpd-cli [options]

Options:
 -V, --version          Prints image-sausage's version
 -H, --help             Print this help
 -D, --directory                Set root directory for ftp

Optional arguments:
 -P, --port             Set custom port (default: 21)
 -UP, --user-password           List of users as user1:password1,user2:password2 (If not presented anonymous access is enabled)
 -S, --stop             Signal to stop ftpd-cli daemon
 -DD, -DD               Do not daemonize
```