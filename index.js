const puppeteer = require('puppeteer');
require('dotenv').config();

const args = process.argv.slice(1)
var days = 1;
if (args[1]) {
    console.log(args);
    days = Number(args[1])
}
var daysDownloaded = 0;

(async () => {

    const browser = await puppeteer.launch({headless: false});
    
    const page = await browser.newPage();
    const client = await page.target().createCDPSession()
    await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: process.env.DOWNLOAD_DIR,
    })

    await page.goto('https://kundenportal.tinetz.at/powercommerce/tinetz/fo/portal/loginProcess');
    await new Promise(r => setTimeout(r, 5000));
    await page.click('#modalSave');
    await new Promise(r => setTimeout(r, 1000));
    await page.type("#login", process.env.USERNAME);
    await page.type("#password", process.env.PASSWORD);
    await Promise.all([
        page.click('#loginButton'),
        page.click('#loginButton'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    await page.goto('https://kundenportal.tinetz.at/powercommerce/tinetz/fo/portal/consumptionDetails?meteringCode=' + process.env.METERING_CODE, {timeout: 5000});
    await new Promise(r => setTimeout(r, 2000));
    
    await page.waitForSelector('#icon-bar-dropdown', {
        visible: true,
      });

      await page.$eval("input[value='Tag']", elem => elem.click())
      do {
        await page.click('.fa-caret-square-left');

        await page.click('.fa-download');
        const [button] = await page.$x("//a[contains(., 'Export als CSV-Datei')]");
        button.click()
        await delay(1000); 
        daysDownloaded ++;
      } while (daysDownloaded < days);
   
    await browser.close();
})();

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
}