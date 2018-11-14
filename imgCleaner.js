const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const DB_NAME = "./content/data/ghost-local.db";

function readFileList(path, filesList = []) {
  const files = fs.readdirSync(path);
  files.forEach((itm, index) => {
    const stat = fs.statSync(path + itm);
    if (stat.isDirectory()) {
      //递归读取文件
      readFileList(path + itm + "/", filesList);
    } else {
      const obj = {}; //定义一个对象存放文件的路径和名字
      obj.path = path; //路径
      obj.filename = itm; //名字
      filesList.push(obj);
    }
  });
  return filesList;
}

const ALL = (sql, params) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_NAME);
    db.serialize(function() {
      db.all(sql, params, (err, row) => {
        if (err) throw err;
        resolve(row);
      });
    });
    db.close();
  });
};

function isImg(url) {
  const exts = ["jpg", "gif", "png", "jpeg", "svg"];
  const split = url.split(".");
  if (split.length > 1) {
    const ext = split[split.length - 1].toLowerCase();
    return exts.indexOf(ext) > -1;
  } else {
    return false;
  }
}

function getAllImages() {
  const filesList = readFileList("./content/images/");
  const rPathList = filesList.map(obj => {
    return obj.path.replace("./content", "/content") + obj.filename;
  });
  const result = rPathList.filter(str => {
    return isImg(str);
  });
  return result;
}

/**
 * 获取 HTML 中的图片
 * @param {} content
 */
function getHTMLImages(content) {
  const result = [];
  const pattern = /src="(.*?)".*?>/g;
  let matcher = null;
  while ((matcher = pattern.exec(content)) !== null) {
    const imgUrl = matcher[1];
    if (isImg(imgUrl)) {
      result.push(imgUrl);
    }
  }
  return result;
}

// 过滤外链图片
function filterOutterImgs(imgs) {
  return imgs.filter(img => img.indexOf("content/images/") > -1);
}

function read(prompt, callback) {
  process.stdout.write(prompt + ":");
  process.stdin.resume();
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", function(chunk) {
    process.stdin.pause();
    callback(chunk.trim());
  });
}

(async function() {
  const allImgs = getAllImages();
  let imgInUse = [];
  const posts = await ALL("SELECT html,feature_image,og_image,twitter_image FROM posts", {});
  posts.forEach(post => {
    const imgs = getHTMLImages(post.html);
    // console.log(post.html)
    if (imgs.length > 0) {
      imgInUse = imgInUse.concat(imgs);
    }
    if (post.feature_image) {
      imgInUse.push(post.feature_image);
    }
    if (post.og_image) {
      imgInUse.push(post.og_image);
    }
    if (post.twitter_image) {
      imgInUse.push(post.twitter_image);
    }
  });

  const users = await ALL("SELECT profile_image, cover_image FROM users", {});
  users.forEach(user => {
    if (user.profile_image) {
      imgInUse.push(user.profile_image);
    }
    if (user.cover_image) {
      imgInUse.push(user.cover_image);
    }
  });

  const tags = await ALL("SELECT feature_image FROM tags", {});
  tags.forEach(tag => {
    if (tag.feature_image) {
      imgInUse.push(tag.feature_image);
    }
  });

  // cover_image
  const settings = await ALL("SELECT value FROM settings WHERE key='cover_image' or key='icon' or key='logo'", {});
  settings.forEach(setting => {
    if (setting.value) {
      imgInUse.push(setting.value);
    }
  });

  imgInUse = filterOutterImgs(imgInUse);
  // console.log(allImgs);
  // console.log(imgInUse);
  let noUseList = [];
  allImgs.forEach(img => {
    const noUse = imgInUse.indexOf(img) == -1;
    if (noUse) {
      noUseList.push(img);
    }
  });
  noUseList.forEach(img => console.log("-> " + img));
  read(`删除这${noUseList.length}个图片？(yes/no)`, input => {
    if (input == "yes") {
      noUseList.forEach(img => {
        const exists = fs.existsSync("." + img);
        fs.unlinkSync("." + img);
        console.log("delete " + img + " success");
      });
    } else {
      console.log("cancel by user");
    }
  });
})();
