let  express = require('express');
const spawnSync = require('child_process').spawnSync;
let bodyParser = require('body-parser')
let app = express();
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

const tools = require("./for");
    
/**
 * 实现登录验证功能
 */
app.post('/api/login', async function (req, res) {
  let name = req.body.username.trim();
  let pwd = req.body.pwd.trim();

  try {
    let selectSQL = "select * from user where username = '" + name + "' and password = '" + pwd + "'";
    const userInfo = await tools.packet(selectSQL);
    res.send({
      status: 'success',
      data: {
        userid: userInfo[0].userid,
        username: userInfo[0].username,
      },
      msg: '登录成功！'
    })
  } catch(e) {
    res.send({
      status: 'error',
      msg: e
    })
  }
});

    
/**
 * 实现注册功能
 */
app.post('/api/register', async function (req,res) {
  let name = req.body.username.trim();
  let pwd = req.body.pwd.trim();
  try {
    const insertSQL = `insert into user(username, password) values('${name}', '${pwd}')`;
    await tools.packet(insertSQL);
    res.send({
      status: 'success',
      msg: '注册成功啦！'
    })
  } catch(e) {
    res.send({
      status: 'error',
      msg: e
    })
  }
})

app.get('/api/getList', async function (req, res) {
  if (!req.query.userid || req.query.userid === 'undefined') {
    res.send({
      status: 'error',
      msg: '未登录'
    })
    return;
  }
  let selectMovieInfoSQL = "select movieid,moviename,picture from movieinfo limit 1000";
  let movieinfolist = [];

  try {
    movieinfolist = await tools.packet(selectMovieInfoSQL);

    function randomFrom(lowerValue, upperValue) {
      return Math.floor(Math.random() * (upperValue - lowerValue + 1) + lowerValue);
    }

    let lowerValue = 0;
    let upperValue = movieinfolist.length;
    let index = randomFrom(lowerValue, upperValue);
    let movielist = [];
    let movieNumbers = 10;
    for (let i = 0; i < movieNumbers; i++) {
      index = randomFrom(lowerValue, upperValue);
      movielist.push({
        movieid: movieinfolist[index].movieid,
        moviename: movieinfolist[index].moviename,
        picture: movieinfolist[index].picture
      });
    }
    res.send({
      status: 'success',
      data: {
        movieforpage: movielist
      },
      msg: '获取成功！'
    })
  } catch (e) {
    res.send({
      status: 'error',
      msg: e
    })
  }
});


/**
 * 把用户评分写入数据库
 */
app.post('/api/submituserscore', async function (req, res) {
  if (!req.body.userid || req.body.userid === 'undefined') {
    res.send({
      status: 'error',
      msg: '未登录'
    })
    return;
  }

  const userid = req.body.userid;
  const selectResult = req.body.selectResult;

  try {
    //删除该用户历史评分数据，为写入本次最新评分数据做准备
    const deleteSQL = 'delete from  personalratings where userid=' + userid
    await tools.packet(deleteSQL);

    const len = selectResult.length;

    const mytimestamp = new Date().getTime().toString().slice(1, 10);
    for (let i = 0; i < len; i++) {
      const insertRatingSQL = `insert into personalratings values(${userid}, ${selectResult[i]['movieid']}, ${selectResult[i]['moviescore']}, ${mytimestamp});`;
      await tools.packet(insertRatingSQL);
    }
    res.send({
      status: 'success',
      msg: '评分成功！'
    })

  } catch(e) {
    res.send({
      status: 'error',
      msg: e
    })
  }
}); 


/**
 * 调用Spark程序为用户推荐电影并把推荐结果写入数据库,把推荐结果显示到网页
 */     
app.post('/api/recommendmovieforuser',async function (req,res) {
  if (!req.body.userid || req.body.userid === 'undefined') {
    res.send({
      status: 'error',
      msg: '未登录'
    })
    return;
  }

  const userid = req.body.userid;
  const path = '/input_spark';
  //调用Spark程序为用户推荐电影并把推荐结果写入数据库
  await spawnSync('/opt/spark/bin/spark-submit', ['--class', 'recommend.MovieLensALS', '/home/axton/IdeaProjects/Film_Recommend_Dataframe/out/artifacts/Film_Recommend_Dataframe_jar/Film_Recommend_Dataframe.jar', path, userid], {
    shell: true,
    encoding: 'utf8'
  });
  try {
    //从数据库中读取推荐结果,把推荐结果显示到网页
    let selectRecommendResultSQL = "select recommendresult.userid,recommendresult.movieid,recommendresult.rating,recommendresult.moviename,movieinfo.picture from recommendresult inner join movieinfo on recommendresult.movieid=movieinfo.movieid where recommendresult.userid=" + userid;
    const result = await tools.packet(selectRecommendResultSQL);
    res.send({
      status: 'success',
      data: result,
      msg: '推荐成功！'
    })
  } catch(e) {
    res.send({
      status: 'error',
      msg: e
    })
  }
})

app.listen(3000, function () {
  console.log("movierecommend server start......");
})
