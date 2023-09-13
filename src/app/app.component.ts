import { saveAs } from 'file-saver';
import {AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';
import WebViewer, {WebViewerInstance} from "@pdftron/webviewer";
import {Subject} from "rxjs";

@Component({
  selector: 'app-root',
  styleUrls: ['app.component.css'],
  templateUrl: 'app.component.html'
})
export class AppComponent implements AfterViewInit {
  wvInstance?: WebViewerInstance;
  
  @ViewChild('viewer') viewer!: ElementRef;
  
  @Output() coreControlsEvent:EventEmitter<string> = new EventEmitter();

  private documentLoaded$: Subject<void>;

  constructor() {
    this.documentLoaded$ = new Subject<void>();
  }

  ngAfterViewInit(): void {

    WebViewer({
      path: '../lib/',
      fullAPI: true,
      initialDoc: '../files/file.docx',
      loadAsPDF: true,
      licenseKey: 'demo:1684117218449:7daeec5f0300000000b410c2b2824e02d7e6f8d95281e6b48e2ea17c44'  // sign up to get a free trial key at https://dev.apryse.com
    }, this.viewer.nativeElement).then(async(instance) => {
  
      const {Core} = instance;

      const { documentViewer, annotationManager, Search, PDFNet } = Core;
      await PDFNet.initialize();

      documentViewer.addEventListener('documentLoaded', async () => {
        const doc = await documentViewer.getDocument();
        const xfdfString = await annotationManager.exportAnnotations();
        const options = { xfdfString, flatten: true };
        const data = await doc.getFileData(options);
        const arr = new Uint8Array(data);
        const blob = new Blob([arr], { type: 'application/pdf' });
        saveAs(blob, 'converted.pdf');
        const page = await (await doc.getPDFDoc()).getPage(1);
        const txt = await PDFNet.TextExtractor.create();
        
        txt.begin(page); // You should begin text extraction for a specific page
        
        let line = await txt.getFirstLine();
        console.log("line", line);
        let word = await line.getFirstWord();
        console.log("Word", word);
        let sty = await word.getStyle();
        console.log("Style",sty);
        let fontName = await sty.getFontName();
        let fontSize = await sty.getFontSize();
        
        console.log("Font Name:", fontName);
        console.log("Font Size:", fontSize);
        
        // Make sure to clean up resources
        txt.destroy();
      });
    });   
  }
}
