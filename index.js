const express = require('express')
const app = express();
const {  AuthorizationCode } = require('simple-oauth2');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}))

const static_files_router = express.static('static_files');
app.use( static_files_router );

const cookieSessionModule = require('cookie-session');

const cookieInitializationParams = {
  name: 'elise_session_cookie',
  keys: ['encryptionkey'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}

const cookieSessionMiddleware = cookieSessionModule(cookieInitializationParams)
app.use(cookieSessionMiddleware)

const ion_client_id = 'Ul7HZefZqTcVxHq4sOTDybcfiII7HJIGkKYTJcTO';
const ion_client_secret = 'cqUHovgONUtOI39r5IHH7XILaDjtEjJJ62QYm3HmSRhLM716dZKoteGuiak4Yo7kF6SAIvGRrgDxjOiLm0CjERF42lpJqGehNfJT3ugXkAMW0LXBjxQ0XWKH5UcHEISB';
const ion_redirect_uri = 'http://127.0.0.1/cookie_login';    

const oauth_params = {
  client: {
    id: ion_client_id,
    secret: ion_client_secret,
  },
  auth: {
    tokenHost: 'https://ion.tjhsst.edu/oauth/',
    authorizePath: 'https://ion.tjhsst.edu/oauth/authorize',
    tokenPath: 'https://ion.tjhsst.edu/oauth/token/'
  }
}

const client = new AuthorizationCode(oauth_params);
const authorizationUri = client.authorizeURL({
    scope: "read",
    redirect_uri: ion_redirect_uri
});

function sqlPromise(sql) {
    return new Promise( (resolve, reject) => {
        db.get(sql, (err, rows) => {
            resolve(rows.count)
        })   
    })
}

function sqlPromise2(sql, params) {
    return new Promise( (resolve, reject) => {
        db.run(sql, params, (err) => {
          resolve("success")
        })   
    })
}

app.get('/', function (req, res) {
    let {visits} = req.session;
    visits ||= 0;
    req.session.visits = visits;

    if(req.session.visits>=1){
        res.redirect("/cookie_game")
    }
    else {
        res.render('blocked', {'login_link' : authorizationUri})
    }
});

app.get('/cookie_login', async function(req, res) { 
  const {code} = req.query;
  const options = {
      'code': code,
      'redirect_uri': ion_redirect_uri,
      'scope': 'read'
  };
  let token;
  try {
      token = await client.getToken(options);    
  } 
  catch (error) {
      console.log('Access Token Error', error.message);
       res.send(502)
  }
  const access_token = token.token.access_token;
  const authenticated_link = `https://ion.tjhsst.edu/api/profile?format=json&access_token=${access_token}`;
  console.log(authenticated_link)
  req.session.visits = 1;
  res.redirect('/cookie_game')
});

app.get('/cookie_game', async function(req, res) {
    let sqlquery = 'SELECT * FROM cookie WHERE c_name="clicks"';
    let results = await sqlPromise(sqlquery);
    let out = {
        'cookie_count' : results
    }
    res.render('cookie_clicker', out)
})

app.get('/click_up', async (req,res) => {
    sql = 'SELECT * FROM cookie WHERE c_name="clicks"';
    a = (await(sqlPromise(sql)))+1
    sql = "UPDATE cookie SET count=(?) WHERE c_name='clicks'";
    b = await(sqlPromise2(sql, [a]))
    result  = {
	  "clicks": a,
	  }
    res.json(result)
})

app.debug = true
app.listen(80)