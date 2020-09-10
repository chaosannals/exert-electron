import fs from 'fs';
import path from 'path';
import superagent from 'superagent';
import cheerio from 'cheerio';

class Downloader {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * 获取文件夹目录。
     * 
     */
    async fetchFolders() {
        let response = await superagent.get(this.baseUrl)
        let $ = cheerio.load(response.text);
        let links = $('a');
        let result = [];
        for (let key of Object.keys(links)) {
            let a = links[key];
            if (a.attribs) {
                let url = new URL(a.attribs.href, this.baseUrl);
                if (/mirrors\/electron\/\d+.\d+.\d+/i.test(url.href)) {
                    result.push(url.href);
                }
            }
        }
        return result.map(link => {
            let r = link.match(/\/(\d+\.\d+\.\d+)(-.+?)?\//);
            return {
                version: r[1].split('.').map(i => Number(i)),
                tail: r[2],
                link: link
            };
        }).filter(i => !i.tail).sort((a, b) => {
            for (let i = 0; i < 3; ++i) {
                if (a.version[i] < b.version[i]) {
                    return 1;
                } else if (a.version[i] > b.version[i]) {
                    return -1;
                }
            }
            return 0;
        });
    }

    /**
     * 获取目录下的压缩包。
     * 
     * @param {*} folder 
     */
    async fetch(folder) {
        let response = await superagent.get(folder.link);
        let $ = cheerio.load(response.text);
        let links = $('a');
        let result = [];
        for (let key of Object.keys(links)) {
            let a = links[key];
            if (a.attribs) {
                let url = new URL(a.attribs.href, folder.link);
                if (/\.(zip|txt)$/i.test(url.href)) {
                    result.push(url.href);
                }
            }
        }
        let version = 'v' + folder.version.join('.');
        return result.map(link => {
            let name = path.basename(link);
            return {
                link: link,
                name: name,
                target: `httpsgithub.comelectronelectronreleasesdownload${version}${name}`
            }
        }).filter(i => {
            return /^electron-/.test(i.name);
        });
    }

    /**
     * 开始下载。
     * 
     */
    async download(limit) {
        let cachePath = path.resolve(process.env.USERPROFILE, 'AppData', 'Local', 'electron', 'Cache');
        let folders = await this.fetchFolders();
        if (limit) {
            folders = folders.slice(0, limit);
        }
        for (let folder of folders) {
            for (let i of await this.fetch(folder)) {
                let p = path.resolve(cachePath, i.target);
                if (!fs.existsSync(p)) {
                    fs.mkdirSync(p, { recursive: true });
                }
                let fp = path.resolve(cachePath, i.name);
                if (fs.existsSync(fp)) {
                    console.log('exists', fp);
                    continue;
                }
                console.log('download', i.link, ' => ', fp);
                let r = await superagent.get(i.link);
                fs.writeFileSync(fp, r.body);
            }
        }
    }
}

try {
    let downloader = new Downloader('https://npm.taobao.org/mirrors/electron');
    downloader.download(1);
} catch (e) {
    console.log(e);
}
