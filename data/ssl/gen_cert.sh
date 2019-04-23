#! /usr/bin/env bash

openssl genrsa 1024 > filmotheque.key
chmod -c 400 filmotheque.key
echo
echo 'mettre le nom du site dans => Common Name (eg, YOUR name) []:www.famille-besson.com'
echo
openssl req -new -key filmotheque.key > filmotheque.csr
openssl x509 -req -days 3650 -in filmotheque.csr -signkey filmotheque.key -out filmotheque.crt
