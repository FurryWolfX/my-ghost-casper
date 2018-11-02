$(function() {
  function filterData(data, value) {
    var result = data.posts.filter(function(post) {
      var inTitle = true;
      var inExcerpt = true;
      if (!post.title || post.title.toLowerCase().indexOf(value.toLowerCase()) == -1) {
        inTitle = false;
      }
      if (!post.custom_excerpt || post.custom_excerpt.toLowerCase().indexOf(value.toLowerCase()) == -1) {
        inExcerpt = false;
      }
      return inTitle || inExcerpt;
    });
    return result;
  }

  function hQuery(value, callback) {
    var now = new Date().getTime();
    var cacheStr = window.localStorage.getItem("posts-cache");
    var needNewData = true;
    var cache = null;
    if (cacheStr) {
      cache = JSON.parse(cacheStr);
      if (now - cache.time < 1000 * 60 * 5) {
        // 相差小于 5 分钟，不需要重新获取数据
        needNewData = false;
      }
    }

    if (needNewData) {
      var params = {
        limit: "all",
        fields: "id,title,custom_excerpt,published_at,url"
      };
      $.get(ghost.url.api("posts", params)).done(function(data) {
        window.localStorage.setItem(
          "posts-cache",
          JSON.stringify({
            data: data,
            time: new Date().getTime()
          })
        );
        var result = filterData(data, value);
        callback(result);
      });
    } else {
      var result = filterData(cache.data, value);
      callback(result);
    }
  }

  function formatDate(date, format) {
    //format: "yyyy年MM月dd日hh小时mm分ss秒"
    var o = {
      "M+": date.getMonth() + 1, //month
      "d+": date.getDate(), //day
      "h+": date.getHours(), //hour
      "m+": date.getMinutes(), //minute
      "s+": date.getSeconds(), //second
      "q+": Math.floor((date.getMonth() + 3) / 3), //quarter
      S: date.getMilliseconds() //millisecond
    };

    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
      if (new RegExp("(" + k + ")").test(format)) {
        format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
      }
    }
    return format;
  }

  function cutDate(datetime) {
    var dt = new Date(datetime);
    return formatDate(dt, "yyyy-MM-dd");
  }

  var $resultsMask = $("#results-mask");
  var $results = $("#results");

  $resultsMask.click(function() {
    $resultsMask.hide();
    $("#search-field").focus();
  });

  $("#search-submit").click(doSearch);
  $("#search-field").keyup(function(event) {
    if (event.keyCode == 13) {
      doSearch();
    }
  });

  function doSearch() {
    var value = $("#search-field").prop("value");
    if (value) {
      hQuery(value, function(data) {
        var html = '<h2 class="title">搜索到' + data.length + "个结果</h2>";
        data.forEach(function(post) {
          var template = "<a id='gh-{{ref}}' class='gh-search-item' href='{{link}}'><h2>{{title}}<span>{{pubDate}}</span></h2></a>";
          template = template.replace(/\{\{ref\}\}/g, post.id);
          template = template.replace(/\{\{title\}\}/g, post.title);
          template = template.replace(/\{\{link\}\}/g, post.url);
          template = template.replace(/\{\{pubDate\}\}/g, cutDate(post.published_at));
          html += template;
        });
        $resultsMask.show();
        $results.html(html);
      });
    } else {
      $resultsMask.hide();
    }
  }
});
