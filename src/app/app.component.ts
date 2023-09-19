import { saveAs } from 'file-saver';
import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import WebViewer, { Core, WebViewerInstance } from "@pdftron/webviewer";
import { Subject } from "rxjs";

@Component({
  selector: 'app-root',
  styleUrls: ['app.component.css'],
  templateUrl: 'app.component.html'
})
export class AppComponent implements AfterViewInit {
  wvInstance?: WebViewerInstance;

  @ViewChild('viewer') viewer!: ElementRef;

  @Output() coreControlsEvent: EventEmitter<string> = new EventEmitter();

  private documentLoaded$: Subject<void>;

  constructor() {
    this.documentLoaded$ = new Subject<void>();
  }

  ngAfterViewInit(): void {
    WebViewer({
      path: '../lib/',
      fullAPI: true,
      initialDoc: '../files/testpara2.docx',
      loadAsPDF: true, // this must be enabled to allow docx to be loaded as PDF
      licenseKey: 'demo:1684117218449:7daeec5f0300000000b410c2b2824e02d7e6f8d95281e6b48e2ea17c44' // sign up to get a free trial key at https://dev.apryse.com
    }, this.viewer.nativeElement).then( (instance) => {
      const { Core } = instance;
      const { documentViewer, annotationManager, PDFNet } = Core;

      PDFNet.initialize();

      documentViewer.addEventListener('documentLoaded', async () => {
        const doc = await documentViewer.getDocument();
        const pdfDoc = await doc.getPDFDoc();
        pdfDoc.initSecurityHandler();
        const pgnum = await doc.getPageCount();
        console.log("Total Pages: ", pgnum); // Get Page Count
        const margin = await documentViewer.getMargin();
        console.log("Margin: ", margin); // Get Page Margin
        for (let pageNum = 1; pageNum <= pgnum; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          if (await page.getIndex() === 0) {
            console.log("Page not found.");
          }
          const pageReader = await PDFNet.ElementReader.create();
          await pageReader.beginOnPage(page);
          let prevBaseline = 0;
          let foundFirstTextElement = false;
          for (

            let element = await pageReader.next();
        
            element !== null;
        
            element = await pageReader.next()
        
          ) {
            const type = await element.getType();
            switch (type) {
              case PDFNet.Element.Type.e_path: // Process path data...
                {
                  const data = await element.getPathData();
                }
                break;
              case PDFNet.Element.Type.e_text: // Process text strings...
                {
                  const data = await element.getTextString();
                  console.log("Text Content", data);
                  console.log("Text Type", type);
                  const gState = await element.getGState();
                  console.log("Text Font", await (await gState.getFont()).getFamilyName()); // Get text font
                  console.log("Text Font Size", await gState.getFontSize()); // Get text font size
                  console.log("Text Leading", await gState.getLeading()); // Get text leading
                  const bbox = await element.getBBox();
                  const curBaseline = bbox.y1; // Use bbox.y1 to get the top y-coordinate of the bounding box
                  if (!foundFirstTextElement) {
                    // This is the first text element, set prevBaseline to its baseline
                    prevBaseline = bbox.y2; // Use bbox.y2 to get the bottom y-coordinate of the bounding box
                    foundFirstTextElement = true;
                    console.log("first bottom y coordinate of bounding box", prevBaseline);
                  }

                  if (data === "This") {
                    console.log("yes new line");
                    // It's a new line, calculate line spacing based on the previous baseline
                    if (prevBaseline !== curBaseline) {
                      const verticalDistance = prevBaseline - curBaseline;
                      console.log("vertical spacing", verticalDistance);
                    }
                  }
                  prevBaseline = curBaseline;
                }
                break;
              default:
            }
          }
          await pageReader.end();
        }
        //following code is to export file as PDF.
        const xfdfString = await annotationManager.exportAnnotations();
        const options = { xfdfString, flatten: true };
        const data = await doc.getFileData(options);
        const arr = new Uint8Array(data);
        const blob = new Blob([arr], { type: 'application/pdf' });
        saveAs(blob, 'converted.pdf');
      });
   
    });
  }
}