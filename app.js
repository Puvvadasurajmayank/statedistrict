const express = require("express");
const app = express();

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
app.use(express.json());
let database = null;
const dbPath = path.join(__dirname, "covid19India.db");

const initializeServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("The Server is running at http://localhost:3000")
    );
  } catch (error) {
    console.log(`The error was ${error.message}`);
    process.exit(1);
  }
};

initializeServer();
const convertStates = (states) => {
  return {
    stateId: states.state_id,
    stateName: states.state_name,
    population: states.population,
  };
};
const convertDbObjToDistrict = (district) => {
  return {
    districtId: district.district_id,
    districtName: district.district_name,
    stateId: district.state_id,
    cases: district.cases,
    cured: district.cured,
    active: district.active,
    deaths: district.deaths,
  };
};
app.get("/states/", async (request, response) => {
  const statesQuery = `
    SELECT 
      *
    FROM 
      state;`;
  const allStates = await database.all(statesQuery);
  response.send(allStates.map((eachState) => convertStates(eachState)));
});
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
  SELECT 
    *
    FROM 
    state
    WHERE
    state_id=${stateId};`;
  const stateResponse = await database.get(stateQuery);
  response.send(convertStates(stateResponse));
});
app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const insertQuery = `
  INSERT INTO 
     district(state_id,district_name,cases,cured,active,deaths)
  VALUES
     (${stateId},'${districtName}',${cases},${cured},${active},${deaths});`;
  await database.run(insertQuery);
  response.send("District Successfully Added");
});
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtQuery = `
  SELECT 
     *
  FROM 
     district
  WHERE 
     district_id=${districtId};`;
  const districtResponse = await database.get(districtQuery);
  response.send(convertDbObjToDistrict(districtResponse));
});
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
  DELETE FROM 
        district
    WHERE district_id=${districtId};`;
  const deleteResponse = await database.run(deleteQuery);
  response.send("District Removed");
});
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateQuery = `
   UPDATE
    district
  SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active}, 
    deaths = ${deaths}
  WHERE
    district_id = ${districtId};`;
  await database.run(updateQuery);
  response.send("District Details Updated");
});
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statsQuery = `
  SELECT
  SUM(cases),
  SUM(cured),
  SUM(active),
  SUM(deaths)
  FROM 
   district
   WHERE 
   state_id=${stateId};`;
  const statsResponse = await database.get(statsQuery);
  response.send({
    totalCases: statsResponse["SUM(cases)"],
    totalCured: statsResponse["SUM(cured)"],
    totalActive: statsResponse["SUM(active)"],
    totalDeaths: statsResponse["SUM(deaths)"],
  });
});
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const districtQuery = `
  SELECT 
    state_name
  FROM
    district
  NATURAL JOIN
    state
  WHERE 
    district_id=${districtId};`;
  const districtResponse = await database.get(districtQuery);
  response.send({ stateName: districtResponse.state_name });
});
module.exports = app;
