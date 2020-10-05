const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const {google} = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const formidable = require('formidable');
const credentials = require('./credentials.json');
const { response } = require('express');
const { file } = require('googleapis/build/src/apis/file');

const clientId = credentials.web.client_id;
const clientSecret = credentials.web.client_secret;
const redirectUris = credentials.web.redirect_uris;
const oathtoClient = new google.auth.OAuth2(clientId, clientSecret, redirectUris[0]);

const scope = ['https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file']

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', (req,res)=> res.send(' API Started to run'));

app.get('/getAuthenticationURL', (req, res) => {
    const authenticationURL = oathtoClient.generateAuthUrl({
        access_type: 'offline',
        scope: scope,
    });
    console.log(authenticationURL);
    return res.send(authenticationURL);
});

app.post('/getToken', (req,res) => {
    if(req.body.code == null) return res.status(400).send('Invalid token Request');
    oathtoClient.getToken(req.body.code, (err, token) => {
        if(err){
            console.error('Error in retrieving the access token', err);
            return res.status(400).send('Error in retriveing the acces token');
        }
        res.send(token);
    });
});

app.post('/getUserProfileInformation', (req,res) => {
    if(req.body.token == null) return res.status(400).send('Token not exist');
    oathtoClient.setCredentials(req.body.token);
    const oauthtwo = google.oauth2({version: 'v2', auth: oathtoClient});

    oauthtwo.userinfo.get((err, response) => {
        if(err) res.status(400).send(err);
        console.log(response.data);
        res.send(response.data);
    });
});

app.post('/readGoogleDrive', (req,res) => {
    if(req.body.token == null) return res.status(400).send("Token not exist");
    oathtoClient.setCredentials(req.body.token);
    const googleDrive = google.drive({version: 'v3', auth: oathtoClient});
    googleDrive.files.list({
        pageSize: 10,
    }, (err, response) => {
        if(err){
            console.log('API has been returned an error: ' + err);
            return res.status(400).send(err);
        }
        const driveFiles = response.data.files;
        if(driveFiles.length){
            console.log('Drive Files: ');
            driveFiles.map((file) => {
                console.log(`${file.name} (${file.id})`);
            });
        }
        else{
            console.log('No such files found');
        }
        res.send(driveFiles);
    })
});

app.post('/fileUploadtoDrive', (req, res) => {
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        if (err) return res.status(400).send(err);
        const token = JSON.parse(fields.token);
        console.log(token)
        if (token == null) return res.status(400).send('oauthtoken not exist');
        oAuth2Client.setCredentials(token);
        console.log(files.file);
        const googleDrive = google.drive({ version: "v3", auth: oathtoClient });
        const fileMetadata = {
            name: files.file.name,
        };
        const media = {
            mimeType: files.file.type,
            body: fs.createReadStream(files.file.path),
        };
        googleDrive.files.create(
            {
                resource: fileMetadata,
                media: media,
                fields: "id",
            },
            (err, file) => {
                oathtoClient.setCredentials(null);
                if (err) {
                    console.error(err);
                    res.status(400).send(err)
                } else {
                    res.send('Uploaded Successfully')
                }
            }
        );
    });
});

const port = process.env.port || 5000;
app.listen(port, () => console.log(`Server Started with PORT ${port}`));