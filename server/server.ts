import express from "express";
import bodyParser from "body-parser";
import { stratosController } from "./controllers";
const { Pool } = require("pg");
const app: express.Application = express();
const multer = require("multer");
const cors = require("cors");

/**
 * TYPESCRTIPT INTERFACE DECLARACTIONS
 */
interface queryResultObjType {
  queryStatistics: any;
  queryTable: any;
}

interface awsTypes {
  user: string;
  host: string;
  database: string;
  password: string;
  port: string;
}

const PORT = 3000;

// OBJECT CONTAINING AWS INFO FROM THE FRONT END
let awsInfo: awsTypes = {
  user: "",
  host: "",
  database: "",
  password: "",
  port: "",
};

// DECLARING INITIAL POOL VARIABLE THAT WILL BE UPDATED ONCE APPLICATION REFRESHES
let pool: any;

// DECLARING INITIAL DB VARIABLE THAT WILL BE UPDATED ONCE APPLICATION REFRESHES
const db: any = {};

app.use(bodyParser.json());
app.use(cors());

const storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, "public");
  },
  filename: function (req: any, file: any, cb: any) {
    cb(null, Date.now() + "-" + file.originalName);
  },
});

const upload = multer({ storage: storage }).single("file");

app.post("/upload", (req: any, res: any) => {
  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err);
    } else if (err) {
      return res.status(500).json(err);
    }
  });
  return res.status(200).send(req.file);
});

/**
 * APP.GET REQUEST (/REFRESH): WHEN REFRESHED, THE APP WILL RESET AWS CONNECTION INFO TO EMPTY VALUES
 */
app.get("/refresh", (req, res) => {
  awsInfo = {
    user: "",
    host: "",
    database: "",
    password: "",
    port: "",
  };
  console.log("refreshed: ", awsInfo);
  res.status(200).send("DATABASE CONNECTION HAS BEEN RESET");
});

/**
 * APP.POST REQUEST (/CONNECT): USER WILL CONNECT TO DB BASED ON THEIR INPUTTED AWS RDS INFORMATION
 */
app.post("/connect", (req, res) => {
  console.log("Incoming form information: ", req.body);
  // REASSIGNING AWSINFO PROPERTY VALUES TO THE USER INPUTTED VALUES FROM THE FRONT END SIDEBAR CLOUD BUTTON MODAL
  awsInfo = {
    user: req.body.user,
    host: req.body.host,
    database: req.body.database,
    password: req.body.password,
    port: req.body.port,
  };
  // ESTABLISHING A POOL CONNECTION BASED ON OUR NEWLY INPUTTED DB CONNECTION INFORMATION
  pool = new Pool(awsInfo);
  // ADDING A NEW PROPERTY TO OUR DB VARIABLE WITH OUR POOL METHOD THAT WILL ALLOW US TO QUERY OUR DB
  db["query"] = (text: string, params?: any, callback?: any) => {
    return pool.query(text, params, callback);
  };
  console.log("HOOPLAH MAGIC: ", awsInfo, "We have connected!");
  res.status(200);
});

/**
 * APP.POST REQUEST (/NEWSCHEMA): SEND IMPORTED/INPUTTED SCHEMAS TO CLOUD DB
 */
app.post("/newSchema", stratosController.createSchema, (req, res) => {
  // SENDING CLIENT STATUS FOR SCHEMA CREATION
  res.status(200).send("success");
});

/**
 * APP.POST REQUEST (/RESULTS): RUNNING QUERY REQUEST & TESTS ON THE SCHEMAS IN THE CLOUD
 */
app.post(
  "/results",
  stratosController.queryTable,
  stratosController.runTest,
  (req, res) => {
    // CONDENSING OUR RES.LOCALS VARIABLES INTO AN OBJECT TO SEND BACK TO THE FRONTEND TO BE PARSED
    const queryResultObj: queryResultObjType = {
      queryStatistics: res.locals.explain,
      queryTable: res.locals.queryResult,
    };
    // SENDING CLIENT THE RESULTS FROM THE PERFORMANCE TEST
    res.status(200).send(queryResultObj);
  }
);

/**
 * APP.LISTEN: PORT 3000
 */
app.listen(PORT, () => {
  console.log(`stratosDB server is running on port ${PORT}`);
});

// EXPORTING OUR DB SO THAT WE CAN UTILIZE THE QUERY METHOD IN OUR CONTROLLERS.TS
export default db;
