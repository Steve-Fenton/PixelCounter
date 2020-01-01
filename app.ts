interface ImageContext {
    context: CanvasRenderingContext2D;
    width: number;
    height: number;
}

class ColorMapUI {
    private output: HTMLElement | null = null;
    private percent: HTMLElement | null = null;
    private startTime: number = 0;

    constructor(id: string) {
        const elem = document.getElementById(id);

        if (elem) {
            this.output = elem;
            this.percent = document.createElement('div');
            this.percent.style.backgroundColor = '#339966'
            this.percent.style.transition = 'width 0.2s ease';
            this.percent.style.width = '0';
            this.output.appendChild(this.percent);
        } else {
            console.log('Element not found!', id);
        }
    }

    start() {
        this.startTime = performance.now();
    }

    end() {
        const totalTime = Math.round((performance.now() - this.startTime) / 100) / 10;
        const timing = document.createElement('div');
        timing.innerHTML = `Total time ${totalTime} seconds`;

        if (this.output) {
            this.output.appendChild(timing);
        }
    }

    error(err: string) {
        const elem = document.createElement('div');
        elem.innerHTML = err;

        if (this.output) {
            this.output.appendChild(elem);
        }
    }

    information(info: string) {
        console.log(info);
    }

    progress(progress: number) {
        if (this.percent) {
            const text = progress + '%'
            this.percent.style.width = text;
            this.percent.innerHTML = text;
        }
    }

    showSwatches(image: ImageContext, swatches: [string, number][]) {
        // Get Top Items
        swatches = swatches.slice(0, 20);

        if (this.startTime > 0) {
            this.end();
        }

        const total = image.width * image.height;
        const list = document.createElement('ol');

        for (let swatch of swatches) {
            const elem = this.getSwatch(swatch, total);
            list.appendChild(elem);
        }

        if (this.output) {
            this.output.appendChild(list);
        }
    }

    private getSwatch(swatch: [string, number], total: number) {
        const shareOfTot = Math.round((swatch[1] / total) * 100);
        const shareOfTotal = shareOfTot + '%';
        const elem = document.createElement('li');
        elem.innerHTML = `${swatch[1]}`;
        elem.title = `${shareOfTotal} rgba(${swatch[0]})`;
        elem.style.backgroundColor = `rgba(${swatch[0]})`;
        elem.style.border = '1px solid silver';
        elem.style.margin = '5px 0';
        elem.style.width = shareOfTotal;
        return elem;
    }
}

class ColorMap {
    private dict: { [key: string]: number } = {};

    constructor(private ui = new ColorMapUI('swatches')) {
    }

    processImage(id: string) {
        this.getImage(id).then((image) => {
            if (image.context) {
                this.ui.start();
                this.processPixel(image, 0, 0);
            }
        }).catch((error) => {
            this.ui.error(error);
        });
    }

    private processPixel(image: ImageContext, rowNumber: number, columnNumber: number) {
        columnNumber++;
        if (columnNumber >= image.width) {
            columnNumber = 0;
            rowNumber++;

            const progress = Math.floor((rowNumber / image.height) * 100);
            this.ui.progress(progress);

            if (rowNumber >= image.height) {
                const swatches = this.getOrderedSwatches();
                this.ui.showSwatches(image, swatches);
                return;
            }
        }

        const pixelData = image.context.getImageData(columnNumber, rowNumber, 1, 1).data;
        this.addPixel(pixelData);

        if ((columnNumber + rowNumber) % 50 === 0) {
            // Let someone else have the UI for a while
            window.setTimeout(() => this.processPixel(image, rowNumber, columnNumber), 0);
        } else {
            this.processPixel(image, rowNumber, columnNumber);
        }
    }

    private addPixel(pixelData: Uint8ClampedArray) {
        const key = this.getKey(pixelData);

        if (this.dict[key] == null) {
            this.dict[key] = 0;
        }

        this.dict[key]++;
    }

    private getKey(pixelData: Uint8ClampedArray) {
        const values = [
            this.round(pixelData[0]),
            this.round(pixelData[1]),
            this.round(pixelData[2]),
            this.round(pixelData[3])
        ];

        return `${values[0]},${values[1]},${values[2]},${values[3]}`;
    }

    private getOrderedSwatches() {
        // Create items array
        var items = Object.keys(this.dict).map((key) => {
            return <[string, number]>[key, this.dict[key]];
        });

        // Sort the array based on the number of pixels element
        items = items.sort(function (first: any, second: any) {
            return second[1] - first[1];
        });

        return items;
    }


    private getImage(id: string): Promise<ImageContext> {
        return new Promise((resolve, reject) => {
            const img = <HTMLImageElement>document.getElementById(id);
            if (!img) {
                reject('Image not found.');
            }

            img.onload = () => {
                const width = 25; // 100 works well
                const height = Math.floor((width / img.width) * img.height);

                const context = this.get2dContext(width, height);

                if (context) {
                    context.drawImage(img, 0, 0, width, height);
                    resolve({ context: context, width: width, height: height });
                    return;
                }

                reject('Context not created.');
            }
        });
    }

    private get2dContext(width: number, height: number) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    private round(num: number) {
        return Math.round(num / 51) * 51;
    }
}

const pieMap = new ColorMap();
pieMap.processImage('img');