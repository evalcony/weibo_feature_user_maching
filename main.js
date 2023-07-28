// ==UserScript==
// @name         用户特征关注
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       evalcony
// @match        https://weibo.com/*
// @match        https://m.weibo.cn/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// ==/UserScript==

(function() {
    'use strict';

    // 这里填写要匹配的用户名，以英文逗号分隔
    // 例如 'aaa','bbb','ccc'
    const target_user_list = [
        '上帝之鹰_5zn','地瓜熊老六','理记','拆台CT','周小平同志','地球镜头A','胡锡进','万能的大熊','烧伤超人阿宝','冬亚','史老柒','一个敢于面对的勇者','盖世英雄玉椒龙','卢诗翰','军武季','沉默的山羊',
        '飞扬南石','红隼防务Blood-Wing','军武大伊万','王虎的舰桥','勇往直前FA岚熙',''
    ]
    // 填写 cookie。  chrome 用户按F12即可查看
    const MY_COOKIE = 'SINAGLOBAL=8765918787681.666.1689154357659; UOR=,,m.weibo.cn; XSRF-TOKEN=pupWbUjhsfUmsJCqG_nDeqPw; SSOLoginState=1690090739; _s_tentry=weibo.com; Apache=6485790248763.921.1690509675300; ULV=1690509675301:4:4:1:6485790248763.921.1690509675300:1689696615647; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WhmgvI9xO9S_p.Or.4KMFxD5JpX5KMhUgL.Fo2ceo.NeKzXeKe2dJLoI79GTHifMcnt; ALF=1693109162; SCF=AjjcdpeELlnqz1AKLcHdvf6NnZXFbXapwnMquFuZvR9nIr0vWVXmMyJJ7DvONdyWfVxfcWmGvJG7CcQSZc36rKw.; SUB=_2A25Jx076DeRhGedI6VsW8SzIyj-IHXVqtScyrDV8PUNbmtAGLXalkW9NV4tWcFNHCcd-Y5YHB-uE4QpD9CCUWd6Z; WBPSESS=l3MiMUZR4LzyCbrI5ETXI4-IxU5Dl42v5FC4_HISxwUiHNnjB18vV7ALg3eRp1WrJo-LWUphB1-PmzgrtaJ1OxS-U8VUTQXhpLeEzoAJWQrmd2ztQr5B7CzvIt9zssQl90BUC6qs2gbmS73rN7VE5A=='

    // 已经搜索过的用户缓存数据
    let searched_user_cach = []
    // 用户关注的 target_user_list 命中数
    let searched_user_target_match_num_cache = []

    // 最大查询分页数 <= 11 (11是微博设置的查看上限)
    let max_page = 5
    // 命中数
    const buf = new ArrayBuffer(4);
    const total_match_num = new Int32Array(buf);

    let showFlag = 0

    new MutationObserver((mutations) => {
        let mutation = mutations[0]

        showFlag += 1

        if (showFlag % 2 == 0) {
            // 移除
            document.querySelector('#my_div').remove()
            return
        }

        let popCard = mutation.target
        let nameCard = popCard.childNodes[0].childNodes[0].childNodes[2].childNodes[1]
        let hrefCard = popCard.childNodes[0].childNodes[1].childNodes[0].childNodes[0].childNodes[1]
        let username = nameCard.innerText
        let href = hrefCard.href
        // 获得uid
        let uid = getUserId(href)
        console.log(href)
        console.log(username)

        search(uid, username)
        // 渲染
        flushEle(popCard, username)

    }).observe(document.querySelector('.popcard'), {
        //childList: true,
        attributes: true,
        //subtree: true,
    });

    console.log(Atomics.load(total_match_num, 0))


function flushEle(popCard, name) {
    let div = makeFocusDiv(name)
    popCard.appendChild(div)
}

function getUserId(href) {
    // https://weibo.com/u/page/follow/123123123?relate=fans
    let l = href.indexOf('follow/')
    let r = href.indexOf('?')
    let text = href.substring(l+'follow/'.length, r)
    console.log(text)
    return text
}

function makeFocusDiv(name) {

    // 获取缓存的命中user数量
    let cachedPos = cached(name)
    console.log('cachedPos = ' + cachedPos)
    console.log(searched_user_cach)
    console.log(searched_user_target_match_num_cache)
    let num = 0
    if (cachedPos != -1) {
        num = searched_user_target_match_num_cache[cachedPos]
    } else {
        num = '正在请求数据...请稍后'
    }

    let div = document.createElement('div');
    div.id = 'my_div'
    div.textContent = '命中特征用户数量：' + num
    return div
}

// 查询用户关注列表
async function search(uid, name) {
    if (cached(name) != -1) {
        // do cached job

        return
    }

    // 遍历关注列表
    Atomics.store(total_match_num, 0, 0); // 原子写入
    for (var i = 1; i <= max_page; i++) {
        await async_fetch(uid, i)
        console.log(i)
    }
    console.log("查询结果：" + name + "_" + Atomics.load(total_match_num, 0))

    searched_user_cach.push(name)
    searched_user_target_match_num_cache.push(Atomics.load(total_match_num, 0))
}

// 查找缓存数组的下标
function cached(name) {
    for (var i in searched_user_cach) {
        if (name == searched_user_cach[i]) {
            return i
        }
    }
    return -1
}

// 同步请求数据
async function async_fetch(uid, page_num) {
    var myHeaders = new Headers();
    myHeaders.append('Cookie', 'SINAGLOBAL=8765918787681.666.1689154357659; UOR=,,m.weibo.cn; XSRF-TOKEN=pupWbUjhsfUmsJCqG_nDeqPw; SSOLoginState=1690090739; _s_tentry=weibo.com; Apache=6485790248763.921.1690509675300; ULV=1690509675301:4:4:1:6485790248763.921.1690509675300:1689696615647; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WhmgvI9xO9S_p.Or.4KMFxD5JpX5KMhUgL.Fo2ceo.NeKzXeKe2dJLoI79GTHifMcnt; ALF=1693109162; SCF=AjjcdpeELlnqz1AKLcHdvf6NnZXFbXapwnMquFuZvR9nIr0vWVXmMyJJ7DvONdyWfVxfcWmGvJG7CcQSZc36rKw.; SUB=_2A25Jx076DeRhGedI6VsW8SzIyj-IHXVqtScyrDV8PUNbmtAGLXalkW9NV4tWcFNHCcd-Y5YHB-uE4QpD9CCUWd6Z; WBPSESS=l3MiMUZR4LzyCbrI5ETXI4-IxU5Dl42v5FC4_HISxwUiHNnjB18vV7ALg3eRp1WrJo-LWUphB1-PmzgrtaJ1O7b6rjzVUp5OKDK3T1NdcAO_fvCpOnxuYkM1sk4tCntvPzevgHHfLShyV3wbrWmisA=='); // 设置Cookie
    myHeaders.append("Referer", "https://m.weibo.cn/");
    myHeaders.append("Sec-Fetch-Mode", "cors");
    myHeaders.append("Accept", "application/json, text/plain, */*");
    myHeaders.append("Origin", "https://weibo.com");
    myHeaders.append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
    myHeaders.append("Client-Version", "v2.40.83");
    myHeaders.append("Content-Type", "application/json");

    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
    };

    var url = 'https://weibo.com/ajax/friendships/friends?page=${page_num}&uid=${uid}'
    url = url.replace('${page_num}', page_num).replace('${uid}', uid);
    //console.log(url)

    await fetch(url, requestOptions)
        .then(response => response.text())
        .then(result => fetchPromise(result))
        .catch(error => console.log('error', error));
}

async function fetchPromise(result) {
    var r = result.indexOf('博主设置仅针对粉丝展示全部关注')
    if (result.indexOf('博主设置仅针对粉丝展示全部关注') != -1) {
        console.log('博主设置仅针对粉丝展示全部关注')
        return
    }
    friendsDataSolver(result)
}


// 数据解析
function friendsDataSolver(result) {
    const parsedData = JSON.parse(result);
    // 设置最大页数
    let total_number = parsedData.total_number
    var total_page_size = parseInt(total_number/20)
    if (total_page_size < 11) {
        max_page = total_page_size
    }

    var users = parsedData.users
    for (var i in users) {
        const u = users[i]
        let f = isInTargetUserList(u.screen_name)
        //console.log(f + ' ' + u.screen_name)
        if (f) {
            //console.log(f + ' ' + u.screen_name)
            Atomics.add(total_match_num, 0, 1)
        }
    }
}
// 是否命中
function isInTargetUserList(name) {
    for (var i in target_user_list) {
        if (name == target_user_list[i]) {
            return true
        }
    }
    return false
}

})();