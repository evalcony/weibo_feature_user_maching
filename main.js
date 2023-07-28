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

    // Your code here...
    const target_user_list = [
        '斋藤酸菜','in_kashgar','骑桶人','于三羊鲜声','韩松落','t0mbkeeper','宝玉xp','纽太普同学','petriv','严锋','电子骑士',
        '何夕','铁拳社','凤凰网科技','人类幻觉体验师','LLS_莉莉丝','女童保护','留几手','汪有','凌太来了','同位素氢','_张大可','向小田',
        '卢诗翰','高质男','不太安静','现充真实幸福的三次元退休日记本','姚广孝_wayne','徐大小越','新浪读书','樊建川','少数派sspai','东东枪','黃執中','宝树',
        '新京报书评周刊','ThreeQ_','复旦经院陈硕','剑桥大学出版社学术出版','王之介一','地球镜头Aa','俄罗斯卫星通讯社','残酷的动物们','人民视频','克宫猫砂盆',
        '海闻看中美','黑尾鸥1988','亞洲風李兆良','潘金莲日记','聂辉华','互联网的那点事','弦子与她的朋友们','牙晓_算命的','三思逍遥','抗战直播','补果君',
        '牛叔','卢克文','大湾区经视','正观视频','文史书坊','傅蔚冈','侠哥说','痴史','互联网新闻网','电商之家','有限次重复博弈','弱智吧官微','今何在','UCG一刀','毒舌电影',
        '黑哥在日本','微博会员','中国日报','蒋胜男','历史上的今天_','午夜骑手毛冬','神气飞天猪'
    ]
    const MY_COOKIE = 'SINAGLOBAL=8765918787681.666.1689154357659; UOR=,,m.weibo.cn; XSRF-TOKEN=pupWbUjhsfUmsJCqG_nDeqPw; SSOLoginState=1690090739; _s_tentry=weibo.com; Apache=6485790248763.921.1690509675300; ULV=1690509675301:4:4:1:6485790248763.921.1690509675300:1689696615647; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WhmgvI9xO9S_p.Or.4KMFxD5JpX5KMhUgL.Fo2ceo.NeKzXeKe2dJLoI79GTHifMcnt; ALF=1693109162; SCF=AjjcdpeELlnqz1AKLcHdvf6NnZXFbXapwnMquFuZvR9nIr0vWVXmMyJJ7DvONdyWfVxfcWmGvJG7CcQSZc36rKw.; SUB=_2A25Jx076DeRhGedI6VsW8SzIyj-IHXVqtScyrDV8PUNbmtAGLXalkW9NV4tWcFNHCcd-Y5YHB-uE4QpD9CCUWd6Z; WBPSESS=l3MiMUZR4LzyCbrI5ETXI4-IxU5Dl42v5FC4_HISxwUiHNnjB18vV7ALg3eRp1WrJo-LWUphB1-PmzgrtaJ1O7b6rjzVUp5OKDK3T1NdcAO_fvCpOnxuYkM1sk4tCntvPzevgHHfLShyV3wbrWmisA=='

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
        let hrefCard = popCard.childNodes[0].childNodes[1].childNodes[0].childNodes[2].childNodes[1]
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