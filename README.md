# Card payment processing with Checkout API

## Using a NodeJS server with Express

### Requirements

- Node v10 or higher;
- Read our [testing instructions](https://www.mercadopago.com/developers/en/guides/payments/api/testing);

### How to run it

#### Using NPM start

In order to execute this sample you need to define the environment variables
`PUBLIC_ACCESS_TOKEN` and `ACCESS_TOKEN`, their values must be the public and
private [keys](https://www.mercadopago.com.br/developers/pt/guides/resources/credentials) of your application, respectively,
then run `npm start`. For instance:

```sh
$ npm install
$ export PUBLIC_ACCESS_TOKEN=<public-key>
$ export ACCESS_TOKEN=<private-key>
$ npm start
```

You execute with the following single line command:

```
$ PUBLIC_ACCESS_TOKEN=<public-key> ACCESS_TOKEN=<private-key> npm start
```

#### Using the script

Alongside this sample's source code, we provide the script `run.sh` which
will request the above mentioned keys and run `npm start` for you:

```sh
$ npm install
$ chmod +x run.sh
$ ./run.sh
```
