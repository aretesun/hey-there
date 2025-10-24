import jsPDF from 'jspdf';
import { TravelPlan, PackingList } from '../types';
import { nanumGothicBase64 } from '../assets/NanumGothicFont';

class PdfBuilder {
    private doc: jsPDF;
    private y: number;
    private pageHeight: number;
    private margin: number;
    private contentWidth: number;
    private fontName: string; // Store the active font name

    constructor() {
        this.doc = new jsPDF();
        this.margin = 15;
        this.y = this.margin;
        this.pageHeight = this.doc.internal.pageSize.getHeight();
        this.contentWidth = this.doc.internal.pageSize.getWidth() - this.margin * 2;
        this.fontName = this.addFont(); // Initialize font and get the name to use
    }

    private addFont(): string {
        try {
            if (!nanumGothicBase64 || nanumGothicBase64.length < 10000 || !nanumGothicBase64.startsWith('AAEAAA')) {
                throw new Error("Font data is missing or appears to be invalid.");
            }
            this.doc.addFileToVFS('NanumGothic-Regular.ttf', nanumGothicBase64);
            this.doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
            return 'NanumGothic'; // Return font name on success
        } catch (e) {
            console.error("Failed to load custom font for PDF, falling back to default. Korean text may not render correctly.", e);
            return 'helvetica'; // Return fallback font name
        }
    }
    
    private checkPageBreak(heightNeeded: number) {
        if (this.y + heightNeeded > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.y = this.margin;
        }
    }
    
    // Helper to consistently set the font before writing text
    private setActiveFont() {
        this.doc.setFont(this.fontName);
    }

    addTitle(text: string) {
        this.setActiveFont();
        this.doc.setFontSize(22);
        this.doc.setTextColor(44, 62, 80);
        const splitText = this.doc.splitTextToSize(text, this.contentWidth);
        this.checkPageBreak(this.doc.getTextDimensions(splitText).h);
        this.doc.text(splitText, this.margin, this.y);
        this.y += this.doc.getTextDimensions(splitText).h + 2;
    }

    addSubtitle(text: string) {
        this.setActiveFont();
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
        this.setActiveFont();
        this.doc.setFontSize(16);
        this.doc.setTextColor(22, 160, 133);
        this.doc.text(text, this.margin, this.y);
        this.y += 8;
        this.doc.setDrawColor(22, 160, 133);
        this.doc.line(this.margin, this.y - 2, this.margin + this.contentWidth, this.y - 2);
    }
    
    addText(text: string | string[], isListItem = false) {
        this.setActiveFont();
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
        this.setActiveFont();
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
        this.setActiveFont();
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
    // The constructor for PdfBuilder now handles font loading robustly.
    // Errors during PDF generation will be caught by the handler in ResultsDisplay.tsx.
    const builder = new PdfBuilder();

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