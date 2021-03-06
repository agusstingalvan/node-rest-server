const  express = require('express');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(process.env.CLIENT_ID);

const Usuario = require('../models/usuario');

const app = express();

app.post('/login', (req, res)=>{
    let body = req.body;
    Usuario.findOne({email: body.email}, (err, usuarioDB)=>{
        if(err){
            return res.status(500).json({
                ok: false, err
            });
        }

        if(!usuarioDB){
            return res.status(400).json({
                ok: false, 
            err: {
                message: 'Usuario y/o contraseña incorrectos'
            }})
        }
        if(!bcrypt.compareSync(body.password, usuarioDB.password)){
            return res.status(400).json({
                ok: false, 
                err: {
                    message: 'Usuario y/o contraseña incorrectos'
                }})
        }

        let token = jwt.sign({usuario: usuarioDB}, process.env.SEED_AUTH, {expiresIn: process.env.CADUCIDAD_TOKEN});

        res.json({
            ok: true,
            usuario: usuarioDB,
            token,
        })
    });
});

async function verify(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    // If request specified a G Suite domain:
    // const domain = payload['hd'];
    return {
        nombre: payload.name,
        email: payload.email,
        img: payload.picture,
        google: true,
    }
  }

app.use('/google', async (req, res)=> {
    let idtoken = req.body.idtoken;

    let googleUser = await verify(idtoken);

    if(!googleUser){
        return res.status(403).json({
            ok: false,
            err: 'Oocurrio un error al verificar el token de google'
        })
    }
    Usuario.findOne({email: googleUser.email}, (err, usuarioDB) => {
        if(err){
            return res.status(400).json({
                ok: false,
                err
            })
        }
        if(usuarioDB){
            if(usuarioDB.google === false){
                return res.status(400).json({
                    ok: false,
                    err: 'El usuario debe de inciar secion normal.'
                })
            }else {
                let token = jwt.sign({usuario: usuarioDB}, process.env.SEED_AUTH, {expiresIn: process.env.CADUCIDAD_TOKEN})
                return res.json({
                    ok: true,
                    usuario: usuarioDB,
                    token: token
                })

            }
        }else {
            let usuario = new Usuario();
            usuario.nombre = googleUser.nombre;
            usuario.email = googleUser.email;
            usuario.img = googleUser.img;
            usuario.google = true;
            usuario.password = ':)';

            usuario.save((err, usuarioDB)=>{
                if(err){
                    return res.status(400).json({
                        ok: false,
                        err
                    });
                }
                let token = jwt.sign({usuario: usuarioDB}, process.env.SEED_AUTH, {expiresIn: process.env.CADUCIDAD_TOKEN})

                res.json({
                    ok: true,
                    usuario: usuarioDB,
                    token: token
                });
            });
        }
    });
});

module.exports = app


    // let googleUser = await verify(token).then(user => console.log(user)).catch(err => {
    //     return res.status(403).json({
    //         ok: false,
    //         err: err
    //     })
    // })

    // Usuario.findOne({email: googleUser.email}, (err, usuarioDB)=>{
    //     if(err){
    //         return res.status(403).json({
    //             ok: false,
    //             err
    //         });
    //     }
    //     if(usuarioDB){
    //         if(usuarioDB.google === false){
    //             return res.status(400).json({
    //                 ok: false,
    //                 err: 'Debe de usar la auth normal'
    //             });
    //         }else{
    //             let token = jwt.sign({usuario: usuarioDB}, process.env.SEED_AUTH, {expiresIn: process.env.CADUCIDAD_TOKEN});
                
    //             return res.json({
    //                 ok: true,
    //                 usuario: usuarioDB,
    //                 token
    //             })
    //         }
    //     }else {
    //         let usuario = new Usuario();
    //         usuario.nombre = googleUser.nombre;
    //         usuario.email = googleUser.email;
    //         usuario.img = googleUser.img;
    //         usuario.google = true;
    //         usuario.password = ':)';

    //         usuario.save((err, usuarioDB) =>{
    //            if(err){
    //                    return  res.status(400).json({
    //                     ok: false,
    //                     err
    //                 });
    //            }
    //            let token = jwt.sign({usuario: usuarioDB}, process.env.SEED_AUTH, {expiresIn: process.env.CADUCIDAD_TOKEN});

    //         res.json({
    //             ok: true,
    //             usuario: usuarioDB,
    //             token
    //         })
    //         });
    //     }
    // })

    // res.send(googleUser)