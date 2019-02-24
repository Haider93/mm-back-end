var express = require('express');
var cors = require('cors')
var app = express();
app.use(cors())
app.options('*', cors());
var cmd = require('node-cmd');
var fs = require('fs-extra');
const path = require('path');
let csvToJson = require('convert-csv-to-json');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var request = new XMLHttpRequest();
const exec = require('child_process').exec;
var execFile = require('child_process').execFile;
var Uid = require('sequential-guid')
var token_gen = new Uid
var addRequestId = require('express-request-id')();
var server = require('http').createServer(app);
var watch = require('node-watch');

app.use(addRequestId);

function processFile(path, name, ext, stat) {
  console.log("processing file " + path + " " + name + ext + " " + stat + "\n");
}


//test
async function run_shell_command(command) {
  let result;
  try {
    result = await execProm(command);
  } catch (ex) {
    result = ex;
  }
  if (Error[Symbol.hasInstance](result))
    return;

  return result;
}
//teste nds

var i = 0 // global variable counter no of child processes
var tokens = [];
var finish_codes = [];
var mm_code;
function execute_mm(token, request, command, mode, dataset, train_episodes, test_episodes) {

  req_token.push({ "req_id": request, "token": token });
  tokens.push(token);
  //console.log(req_token[0]["token"]);
  var mm_process = exec(command + ' ' + mode + ' ' + dataset + ' ' + train_episodes + ' ' +
    test_episodes + ' ' + token);
  mm_process.stdout.on('data', function (data) {
    console.log(data);
  });
  mm_process.stderr.on('data', function(data){
    console.log(data);
  });
  mm_process.on('close', function (exit_code) {
    console.log('Closing code '+exit_code);
    finish_codes.push(exit_code);
  });

  //multiple requests
  // for (i = 0; i < 10; i++) {
  //   (function (i) {
  //     var child = exec(command);

  //     // Add the child process to the list for tracking
  //     p_list.push({ process: child, content: "" });

  //     // Listen for any response:
  //     child.stdout.on('data', function (data) {

  //       console.log(child.pid, data);
  //       p_list[i].content += data;
  //     });

  //     // Listen for any errors:
  //     child.stderr.on('data', function (data) {
  //       //console.log(child.pid, data);
  //       p_list[i].content += data;
  //     });

  //     // Listen if the process closed
  //     child.on('close', function (exit_code) {
  //       console.log('Closed before stop: Closing code: ', exit_code);
  //     });
  //   })(i)
  // }

}


function is_mm_train_complete(path, res) {
  var tokens = path.split('*');
  var file = tokens.join("\\");
  console.log(file);
  // fs.readdir(file,(error, filenames) => {
  //   if (error) throw error;
  //   filenames.forEach(fileName => {
  //     const file = path.parse(fileName).name;
  //     const ext = path.parse(fileName).ext;
  //     if(file.toLocaleLowerCase() === "training_log.csv")
  //     {
  //       fs.watch(file, function() {
  //         console.log("File "+file+ " just changed!");
  //      });
  //     }
  //   });
  // });
  
  // var watcher = watch(file, { recursive: true },function (evt, name) {
  //   if (evt === 'update') {
  //     console.log(name + 'updated');
  //     res.send(evt);
  //   }
  // });
}

function get_log(dir, res, token, log) {

  if (log === "train") {
    fs.readdir(dir, (error, filenames) => {
      if (error) throw error;
      filenames.forEach(fileName => {
        const file = path.parse(fileName).name;
        const ext = path.parse(fileName).ext;
        const filepath = path.resolve(dir, fileName);
        if (file.toLowerCase() === "training_log.csv") {
          fs.stat(dir + '\\training_log.json', function (err, stat) {
            if (err === null)//file exists
            {
              fs.readFile(dir + '\\training_log.json', function (err, data) {
                if (err) throw err;
                //console.log(JSON.parse(data));
                var json_obj = { "train_data": data };
                res.send(JSON.parse(data));
                res.status(200);
              });
            }
            else if (err.code === 'ENOENT') {
              csvToJson.generateJsonFileFromCsv(filepath, dir + '\\training_log.json');
              fs.readFile(dir + '\\training_log.json', function (err, data) {
                if (err) throw err;
                console.log("train log json create")
                res.send(JSON.parse(data));
                res.status(200);
              });
            }
          });
        }
      });
    });
  }
  else if (log === "test") {
    fs.readdir(dir, (error, filenames) => {
      if (error) throw error;
      filenames.forEach(fileName => {
        const file = path.parse(fileName).name;
        const ext = path.parse(fileName).ext;
        const filepath = path.resolve(dir, fileName);
        //console.log(file, ext);
        if (file.toLowerCase() === "test_log" && ext.toLocaleLowerCase() === ".csv") {
          fs.stat(dir + '\\test_log.json', function (err, stat) {
            if (err === null) {
              fs.readFile(dir + '\\test_log.json', function (err, data) {
                if (err) throw err;
                res.send(JSON.parse(data));
                res.status(200);
              });
            }
            else if (err.code === 'ENOENT') {
              csvToJson.generateJsonFileFromCsv(filepath, dir + '\\test_log.json');
              console.log('test json create');
              fs.readFile(dir + '\\test_log.json', function (err, data) {
                if (err) throw err;
                res.send(JSON.parse(data));
                res.status(200);
              });
            }
          })

        }
      });
    });
  }

}

function getDirectories(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path + '/' + file).isDirectory();
  });
}

function read_training_log(dir, res, log, token, processFile) {

  //var token_expr = /token/
  //name.search(token_expr)
  if (typeof token !== 'undefined') {
    //console.log("Token : " + token);
    //console.log("Log query : " + log);
    var dirs_in_dir = getDirectories(dir);
    dirs_in_dir.forEach(dir_in => {
      if (dir_in.indexOf(token) !== -1) {
        get_log(dir + dir_in, res, token, log);
      }
    });
  }
  else {
    // fs.readdir(dir, (error, fileNames) => {
    //   if (error) throw error;

    //   fileNames.forEach(filename => {
    //     // get current file name
    //     const name = path.parse(filename).name;
    //     // get current file extension
    //     const ext = path.parse(filename).ext;
    //     // get current file path
    //     const filepath = path.resolve(dir, filename);


    //     if (log === "train" && typeof log !== 'undefined')//training log
    //     {
    //       if (name.toLowerCase() === "training_log.csv") {
    //         console.log('file path:', filepath);
    //         console.log('file name:', name);
    //         console.log('file extension:', ext);
    //         csvToJson.generateJsonFileFromCsv(filepath, dir + 'training_log.json');
    //         fs.readFile(dir + 'training_log.json', function (err, data) {
    //           if (err) throw err;
    //           console.log(JSON.parse(data));
    //           res.send(JSON.parse(data));
    //           res.status(200);
    //         });
    //       }
    //     }
    //     if (log === "test" && typeof log !== 'undefined') {
    //       if (name.toLowerCase() === "test_log") {
    //         console.log('file path:', filepath);
    //         console.log('file name:', name);
    //         console.log('file extension:', ext);
    //         csvToJson.generateJsonFileFromCsv(filepath, dir + 'test_log.json');
    //         fs.readFile(dir + 'test_log.json', function (err, data) {
    //           if (err) throw err;
    //           console.log(JSON.parse(data));
    //           res.send(JSON.parse(data));
    //           res.status(200);
    //         });
    //       }
    //     }

    //     // get information about the file
    //     // fs.stat(filepath, function (error, stat) {
    //     //   if (error) throw error;

    //     //   // check if the current path is a file or a folder
    //     //   const isFile = stat.isFile();

    //     //   // exclude folders
    //     //   if (isFile) {
    //     //     // callback, do something with the file
    //     //     processFile(filepath, name, ext, stat);
    //     //   }
    //     // });
    //   });
    // });
  }

}


root_dir = 'C:\\Users\\Abbas\\Desktop\\abbas\\rl_markets\\temporary\\';
comp_name = '\\desktop-js4c6g1';
code_exe_path = 'C:\Users\Abbas\Documents\Visual Studio 2017\mm\Release\mm.exe';
arg1 = 1;//mode 
arg2 = 'GSK';//dataset name
arg3 = 1000;//training episodes
arg4 = 15;//testing episodes
req_token = [];

//get training log generated after training
app.get('/get_training_log/:date/:time', function (req, res) {
  //cmd.run('cd PSTools & PsExec.exe notepad');
  // read_training_log(root_dir + req.params.date + '.' + req.params.time + '\\', res, "train", (filepath, name, ext, stat) => {

  // });
});

//get test logs
app.get('/get_test_log/:date/:time', function (req, res) {
  //cmd.run('cd PSTools & PsExec.exe notepad');
  // read_training_log(root_dir + req.params.date + '.' + req.params.time + '\\', res, "test", (filepath, name, ext, stat) => {

  // });
});

app.get('/get_train_token/:mode/:dataset/:train_iter/:test_iter', function (req, res) {
  //cmd.run('cd PSTools & PsExec.exe '+comp_name+' '+code_exe_path+' '+arg1+' '+arg2+' '+arg3+' '+arg4);
  //cmd.run('cd PSTools & PsExec.exe \\desktop-js4c6g1 -u desktop-js4c6g1\abbas -p Abby@1992 -i notepad');
  //build token to ensure uniqueness of request
  execute_mm(token_gen.next(), req.id, '"C:\\Users\\Abbas\\Documents\\Visual Studio 2017\\mm\\Release\\mm.exe"', req.params.mode, req.params.dataset, req.params.train_iter, req.params.test_iter);
  //run_shell_command('cd C:\\Users\\Abbas\\Documents\\Visual Studio 2017\\mm\\Release & mm.exe 1 GSK 100 10').then( result => console.log(result) );
  //res.json()
  res.send(JSON.stringify(req_token));
  //next();
});

app.get('/is_training_finished/:path', function (req, res) {
  is_mm_train_complete(req.params.path, res);
});


app.get('/get_train_log/:token', function (req, res) {
  read_training_log(root_dir, res, "train", req.params.token, (filepath, name, ext, stat) => {

  });
});

app.get('/get_test_log/:token', function (req, res) {
  read_training_log(root_dir, res, "test", req.params.token, (filepath, name, ext, stat) => {

  });
});

app.get('/', function (req, res) {
  res.send("Market Maker is live now...");
});

// app.listen(3000, '193.61.148.124', function () {
//   console.log('Example app listening on port 3000!');
// });

server.listen(3000, function () {
  console.log("listening on port 3000");
});

