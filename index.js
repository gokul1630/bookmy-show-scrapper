const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ticketUrl = '';

const theaterNametoSearch = [''];

const onlyAvailable = false;

const timesToSearch = [''];

const ntfy_channel = '';

const intervalToScrape = 10000;

const fetchTheaters = async () => {
    try {
        const browser = await chromium.launch({ headless: true });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        });

        const page = await context.newPage();

        await page.goto(ticketUrl);

        const container = await page.$(
            '.ReactVirtualized__Grid__innerScrollContainer'
        );

        if (container) {
            const children = await container.$$('.sc-e8nk8f-3');

            if (children) {
                let data = [];
                for (const child of children) {
                    const theaterNameNode = await child.$('.sc-1qdowf4-0');
                    let theaterNameText = '';
                    if (theaterNameNode) {
                        const theaterName = await theaterNameNode.textContent();

                        const regex = new RegExp(
                            theaterNametoSearch.join('|'),
                            'i'
                        );
                        if (
                            theaterNametoSearch?.length &&
                            theaterName &&
                            !regex.test(theaterName)
                        ) {
                            continue;
                        }

                        theaterNameText = theaterName;
                    }

                    const timeNode = await child.$$(
                        onlyAvailable ? '.sc-1vhizuf-1.fxGebS' : '.sc-1vhizuf-1'
                    );

                    const times = [];
                    if (timeNode) {
                        for (const timeEl of timeNode) {
                            const time = await timeEl.$('.sc-1vhizuf-2');
                            const timeText = await time.textContent();

                            const timeRegex = new RegExp(
                                timesToSearch.join('|'),
                                'i'
                            );

                            if (
                                timesToSearch?.length &&
                                timeRegex.test(timeText)
                            ) {
                                times.push(timeText);
                                continue;
                            } else if (timesToSearch?.length) {
                                continue;
                            }

                            times.push(timeText);
                        }

                        if (times?.length) {
                            data.push({ theaterNameText, times });
                        }
                    }
                }

                let notification = '';

                data.forEach((item) => {
                    notification += `
\n${item.theaterNameText}`;

                    notification += `
${onlyAvailable ? 'Only available slots' : 'All slots'} to book\n`;
                    item.times.forEach((time) => {
                        notification += `
${time}`;
                    });
                });

                if (data?.length) {
                    fetch('https://ntfy.sh/' + ntfy_channel, {
                        method: 'POST',
                        body: notification,
                    });
                }
            }
        }

        await browser.close();
    } catch (error) {
        console.error(error);

        setTimeout(() => {
            spawn(process.argv[0], process.argv.slice(1), {
                stdio: 'inherit',
            });
        }, intervalToScrape);
    }
};

(async function loop() {
    while (true) {
        await fetchTheaters();
        await new Promise((res) => setTimeout(res, intervalToScrape));
    }
})();
