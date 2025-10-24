import jsPDF from 'jspdf';
import { TravelPlan, PackingList } from '../types';

class PdfBuilder {
    private doc: jsPDF;
    private y: number;
    private pageHeight: number;
    private margin: number;
    private contentWidth: number;
    private fontLoaded: boolean = false;

    constructor() {
        this.doc = new jsPDF();
        this.margin = 15;
        this.y = this.margin;
        this.pageHeight = this.doc.internal.pageSize.getHeight();
        this.contentWidth = this.doc.internal.pageSize.getWidth() - this.margin * 2;
    }

    async addFont() {
        try {
            const fontUrls = [
                'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/NanumGothic.woff',
                'https://fonts.gstatic.com/ea/nanumgothic/v5/NanumGothic-Regular.ttf',
                'https://cdn.jsdelivr.net/npm/nanumfont@1.0.0/fonts/NanumGothic.ttf'
            ];
            let fontData = null;
            let lastError: any = null;

            for (const url of fontUrls) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    
                    const uint8Array = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < uint8Array.length; i++) {
                        binary += String.fromCharCode(uint8Array[i]);
                    }
                    fontData = btoa(binary);
                    break;
                } catch (err) {
                    console.warn(`Failed to load font from ${url}:`, err);
                    lastError = err;
                }
            }

            if (!fontData) {
                throw new Error(`Failed to load font from all sources: ${lastError?.message || 'Unknown fetch error'}`);
            }

            this.doc.addFileToVFS('NanumGothic-Regular.ttf', fontData);
            this.doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
            this.fontLoaded = true;
        } catch (e: any) {
            console.error("Critical font loading failure:", e);
            this.fontLoaded = false;
            throw new Error(`PDF 폰트 로딩에 실패했습니다: ${e.message}`);
        }
    }

    private setFont() {
        if(this.fontLoaded) {
            this.doc.setFont('NanumGothic');
        } else {
            // Fallback to default if font loading failed
            this.doc.setFont('helvetica');
        }
    }
    
    private checkPageBreak(heightNeeded: number) {
        if (this.y + heightNeeded > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.y = this.margin;
            this.setFont();
        }
    }

    addTitle(text: string) {
        this.setFont();
        this.doc.setFontSize(22);
        this.doc.setTextColor(44, 62, 80);
        const splitText = this.doc.splitTextToSize(text, this.contentWidth);
        this.checkPageBreak(this.doc.getTextDimensions(splitText).h);
        this.doc.text(splitText, this.margin, this.y);
        this.y += this.doc.getTextDimensions(splitText).h + 2;
    }

    addSubtitle(text: string) {
        this.setFont();
        this.doc.setFontSize(14);
        this.doc.setTextColor(127, 140, 141);
        const splitText = this.doc.splitTextToSize(text, this.contentWidth);
        this.checkPageBreak(this.doc.getTextDimensions(splitText).h);
        this.doc.text(splitText, this.margin, this.y);
        this.y += this.doc.getTextDimensions(splitText).h + 6;
    }

    addSectionTitle(text: string) {
        this.y += 5;
        this.checkPageBreak(12);
        this.setFont();
        this.doc.setFontSize(16);
        this.doc.setTextColor(22, 160, 133);
        this.doc.text(text, this.margin, this.y);
        this.y += 8;
        this.doc.setDrawColor(22, 160, 133);
        this.doc.line(this.margin, this.y - 2, this.margin + this.contentWidth, this.y - 2);
    }
    
    addText(text: string | string[], isListItem = false) {
        this.setFont();
        this.doc.setFontSize(10);
        this.doc.setTextColor(52, 73, 94);
        const indent = isListItem ? this.margin + 4 : this.margin;
        const textToSplit = Array.isArray(text) ? text.join('\n') : text;
        const splitText = this.doc.splitTextToSize(textToSplit, this.contentWidth - (isListItem ? 4 : 0));
        this.checkPageBreak(this.doc.getTextDimensions(splitText).h);

        if (isListItem) {
            this.doc.text('•', this.margin, this.y);
        }

        this.doc.text(splitText, indent, this.y);
        this.y += this.doc.getTextDimensions(splitText).h + 4;
    }
    
    addKeyValue(key: string, value: string) {
        const fullText = `${key}: ${value}`;
        this.addText(fullText, true);
    }
    
    addDayTitle(day: number, title: string) {
        this.y += 4;
        const text = `Day ${day}: ${title}`;
        this.checkPageBreak(10);
        this.setFont();
        this.doc.setFontSize(12);
        this.doc.setTextColor(41, 128, 185);
        this.doc.text(text, this.margin, this.y);
        this.y += 7;
    }

    addActivity(time: string, description: string) {
        const fullText = `${time}: ${description}`;
        this.addText(fullText, true);
    }

    addPackingCategory(category: string) {
        this.y += 4;
        this.checkPageBreak(10);
        this.setFont();
        this.doc.setFontSize(12);
        this.doc.setTextColor(142, 68, 173);
        this.doc.text(category, this.margin, this.y);
        this.y += 7;
    }

    addPackingItem(item: string, note?: string) {
        const text = note ? `${item} (${note})` : item;
        this.addText(text, true);
    }

    save(filename: string) {
        this.doc.save(filename);
    }
}

export const downloadPlanAsPdf = async (plan: TravelPlan, packingList: PackingList | null): Promise<void> => {
    const builder = new PdfBuilder();
    await builder.addFont();

    // Header
    builder.addTitle(`${plan.city || ''}, ${plan.country || ''} 여행 계획`);
    builder.addSubtitle(`${plan.startDate || ''} ~ ${plan.endDate || ''}`);

    // General Info
    builder.addSectionTitle('기본 정보');
    if (plan.weather) {
        builder.addKeyValue('예상 날씨', `${plan.weather.averageTemp}, ${plan.weather.description}`);
    }
    if (plan.exchangeRate) {
        builder.addKeyValue('환율 정보', `${plan.exchangeRate.rate} (${plan.exchangeRate.from} to ${plan.exchangeRate.to})`);
    }

    if (plan.culturalTips && Array.isArray(plan.culturalTips)) {
        builder.addText('문화 팁:');
        plan.culturalTips.forEach(tip => builder.addText(tip, true));
    }
    
    if (plan.transportationInfo) {
        builder.addKeyValue('교통 정보', plan.transportationInfo.description);
        if (plan.transportationInfo.options && Array.isArray(plan.transportationInfo.options)) {
            plan.transportationInfo.options.forEach(opt => builder.addText(opt, true));
        }
    }

    if (plan.priceInfo) {
        builder.addKeyValue('현지 물가', `${plan.priceInfo.level}: ${plan.priceInfo.description}`);
        if (plan.priceInfo.examples && Array.isArray(plan.priceInfo.examples)) {
            plan.priceInfo.examples.forEach(ex => builder.addText(ex, true));
        }
    }

    // Itinerary
    if (plan.itinerary && Array.isArray(plan.itinerary)) {
        builder.addSectionTitle('상세 일정');
        plan.itinerary.forEach(dayPlan => {
            if (dayPlan) {
                builder.addDayTitle(dayPlan.day, dayPlan.title);
                if (dayPlan.activities && Array.isArray(dayPlan.activities)) {
                    dayPlan.activities.forEach(activity => {
                        if (activity) {
                            builder.addActivity(activity.time, activity.description);
                        }
                    });
                }
            }
        });
    }

    // Packing List
    if (packingList && packingList.packing_list && Array.isArray(packingList.packing_list)) {
        builder.addSectionTitle('준비물 리스트');
        packingList.packing_list.forEach(category => {
            if (category) {
                builder.addPackingCategory(category.category);
                if (category.items && Array.isArray(category.items)) {
                    category.items.forEach(item => {
                        if (item) {
                            builder.addPackingItem(item.item, item.note);
                        }
                    });
                }
            }
        });
    }

    builder.save(`AI-여행계획-${plan.city || 'plan'}.pdf`);
};