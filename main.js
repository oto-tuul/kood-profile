let link = `https://01.kood.tech/api/graphql-engine/v1/graphql`;

//query basic identification for user oto-tuul
let username = "oto-tuul";
let imageLink = `https://01.kood.tech/git/user/avatar/${username}/-1`;
let userId;
let lastActive;

//user search button, listeners
searchBtn = document.getElementById("userSearchBtn");
searchInput = document.getElementById("userSearchInput");
searchBtn.addEventListener("click", () => {
  let input = searchInput.value;
  searchUser(input);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    let input = searchInput.value;
    searchUser(input);
  }
});

async function searchUser(val) {
  let value = val;

  if (value && value.trim().length > 0) {
    value = value.trim();
  } else {
    console.log("search error: no input");
    return;
  }

  let res = await fetch(link, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `query ($username: String ) {
        user(where: {login: { _eq: $username } }) {
          id
        }
      }`,
      variables: {
        username: value,
      },
    }),
  });

  let resData = await res.json();
  data = resData.data.user;

  if (data.length == 0) {
    console.log("search error: user not found");
    return;
  }

  username = value;
  CLEAR();
  DISPLAY();
}

async function fetchIdAndLastActive() {
  let res = await fetch(link, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `query ($username: String ) {
        user(where: {login: { _eq: $username } }) {
          id
    			progresses (limit: 1, order_by: {createdAt: desc}) {
            object {
              name
            }
      		createdAt
          }
    			
        }
      }`,
      variables: {
        username: username,
      },
    }),
  });

  let resData = await res.json();

  userId = resData.data.user[0].id;
  lastActive = resData.data.user[0].progresses[0].createdAt;
  lastActive = lastActive.slice(0, 10);
  year = lastActive.slice(0, 4);
  month = lastActive.slice(5, 7);
  day = lastActive.slice(8);
  lastActive = day + "/" + month + "/" + year;

  console.log("username: ", username);
  console.log("userId: ", userId);
  console.log("Last active: ", lastActive);
}

let completedProjectsData;
let dateSeries = [];
let offset = 0;
//query and store completed projects for user
async function fetchAllCompletedProjects() {
  let res = await fetch(link, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      //offset 1 to exclued first piscine, has no corresponding transaction
      query: `query ($username: String ) {
        progress(
          where: {_and: [{user: {login: {_eq: $username}}},
            {_or: [{object: {type: {_eq: "project"}}}, {object: {type: {_eq: "piscine"}}}]},
            {isDone: {_eq: true}}]},
          order_by: {updatedAt: asc},
          offset: 1
        ) {
          object {
            id
            name
            type
          }
          updatedAt
          user {
            login
          }
          isDone
          path
        }
      }`,
      variables: {
        username: username,
      },
    }),
  });

  let resData = await res.json();
  // console.log(resData)

  completedProjectsData = resData.data.progress;

  console.log("completed projects: ", completedProjectsData);

  for (let i = 0; i < completedProjectsData.length; i++) {
    dateSeries.push(completedProjectsData[i].updatedAt);
  }
}

let totalXp = 0;
let xpSeries = [];
let xpSeriesCumulative = [];
let projectNameSeries = [];
//query xp data and calculate total xp and level for user
async function fetchTotalXp() {
  await fetchAllCompletedProjects();

  for (let i = 0; i < completedProjectsData.length; i++) {
    let projectName = completedProjectsData[i].object.name;

    let res = await fetch(link, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: `query ($projectNameVar: String, $username: String ) {
          transaction(
            where: {_and: [{user: {login: {_eq: $username}}},
            {object: {name: {_eq: $projectNameVar}}},
            ]},
            order_by: {amount: desc},
            limit: 1) {
            object {
              name
            }
            user {login}
            userId
            amount
            createdAt
          }
        }`,
        variables: {
          username: username,
          projectNameVar: projectName,
        },
      }),
    });

    let resData = await res.json();

    totalXp += resData.data.transaction[0].amount;
    if (i == 0) {
      xpSeriesCumulative.push(resData.data.transaction[0].amount);
    } else {
      xpSeriesCumulative.push(
        xpSeriesCumulative[i - 1] + resData.data.transaction[0].amount
      );
    }
    xpSeries.push(resData.data.transaction[0].amount);
    projectNameSeries.push(resData.data.transaction[0].object.name);
  }
  console.log("xp: ", totalXp);
  console.log("level: ", calculateLevel(totalXp));
}

// Credit to Olari and Kanguste
// Calculates what level this amount of XP would be at
function calculateLevel(xp) {
  let level = 0;

  while (levelNeededXP(++level) < xp) {}

  return level - 1;
}

// Returns the amount of XP needed for any given level
function levelNeededXP(level) {
  return Math.round(level * (176 + 3 * level * (47 + 11 * level)));
}

function missingNextLevel(xp) {
  let level = calculateLevel(xp);
  let missingXp = levelNeededXP(level + 1) - xp;
  return missingXp;
}

function xpOverThisLevel(xp) {
  let level = calculateLevel(xp);
  let overXp = xp - levelNeededXP(level);
  return overXp;
}

// **********************************************************************************
// DISPLAY DATA

//display basic identification
async function diplayBasicId() {
  await fetchIdAndLastActive();

  let profileImg = document.getElementById("profileImg");
  imageLink = `https://01.kood.tech/git/user/avatar/${username}/-1`;
  profileImg.src = `${imageLink}`;

  let profileName = document.getElementById("profileName");
  profileName.innerHTML = `Username: ${username}`;

  let profileId = document.getElementById("profileId");
  profileId.innerHTML = `User id: ${userId}`;

  let profileActive = document.getElementById("profileActive");
  profileActive.innerHTML = `Last active: ${lastActive}`;
}

//display level and level state data, donut chart
async function displayLevelData() {
  let levelDiv = document.getElementById("level");
  levelDiv.innerHTML = `${calculateLevel(totalXp)}
  <p>${Math.round(totalXp / 1000)} kB</p>`;

  new Chartist.Pie(
    "#levelDonut",
    {
      series: [xpOverThisLevel(totalXp), missingNextLevel(totalXp)],
    },
    {
      height: 200,
      width: 200,
      donut: true,
      donutWidth: 20,
      startAngle: 0,
      showLabel: false,
    }
  );
  let numProgress = document.getElementById("numProgress");
  numProgress.innerHTML = `${
    Math.round((xpOverThisLevel(totalXp) / 1000) * 10) / 10
  } / ${
    Math.round(
      ((xpOverThisLevel(totalXp) + missingNextLevel(totalXp)) / 1000) * 10
    ) / 10
  } kB <br>
  next level in: ${
    Math.round((missingNextLevel(totalXp) / 1000) * 10) / 10
  } kB`;
}

//display xp graphs, linechart and barchart
async function drawGraphs() {
  //add date and cumulative xp series to format [{x: Date ..., y: xp}, ...]
  let combinedSeries = [];
  for (let i = 0; i < dateSeries.length; i++) {
    let date = dateSeries[i];
    let xp = xpSeriesCumulative[i];

    let object = { x: new Date(date), y: xp };
    combinedSeries.push(object);
  }

  //add project name and non-cumulative xp, similar
  let combinedNCSeries = [];
  for (let i = 0; i < projectNameSeries.length; i++) {
    let name = projectNameSeries[i];
    let xp = xpSeries[i];

    let object = { x: name, y: xp };
    combinedNCSeries.push(object);
  }

  //sort date and xp array of objects by date
  combinedSeries = combinedSeries.sort((a, b) => a.x - b.x);

  //calculate number of months for dividers
  diffMs =
    new Date(dateSeries[dateSeries.length - 1]).getTime() -
    new Date(dateSeries[0]).getTime();
  diffDays = diffMs / (1000 * 3600 * 24);
  monthN = Math.round(diffDays / 30);

  new Chartist.Line(
    "#xpOverTime",
    {
      series: [
        {
          data: combinedSeries,
        },
      ],
    },
    {
      fullWidth: true,
      lineSmooth: Chartist.Interpolation.step({
        fillHoles: true,
      }),
      showPoint: false,

      axisY: {
        labelInterpolationFnc: function (value) {
          return value / 1000 + " kB";
        },
      },

      axisX: {
        type: Chartist.FixedScaleAxis,
        divisor: monthN + 1,
        labelInterpolationFnc: function (value) {
          return moment(value).format("D. MMM YYYY");
        },
      },
    }
  );

  new Chartist.Bar(
    "#xpFromProject",
    {
      labels: projectNameSeries,
      series: [xpSeries],
    },
    {
      axisY: {
        labelInterpolationFnc: function (value) {
          return Math.round(value / 1000) + " kB";
        },
      },
      axisX: {
        showGrid: false,
      },
    }
  );
}

async function DISPLAY() {
  document.getElementById("overlay").style.display = "block";
  diplayBasicId();
  await fetchTotalXp();

  displayLevelData();
  drawGraphs();
  document.getElementById("overlay").style.display = "none";
}

DISPLAY();

//reset all data to 0
function CLEAR() {
  document.getElementById("overlay").style.display = "block";
  completedProjectsData = [];
  dateSeries = [];
  offset = 0;

  totalXp = 0;
  xpSeries = [];
  xpSeriesCumulative = [];
  projectNameSeries = [];
}
