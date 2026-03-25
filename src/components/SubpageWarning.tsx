import { Globe, FileText } from "lucide-react";

interface SubpageWarningProps {
  inputUrl: string;
  rootUrl: string;
  onAnalyzeRoot: () => void;
  onAnalyzeCurrent: () => void;
}

const SubpageWarning = ({ inputUrl, rootUrl, onAnalyzeRoot, onAnalyzeCurrent }: SubpageWarningProps) => {
  return (
    <div className="max-w-lg mx-auto mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 animate-fade-up">
      <p className="text-sm text-foreground font-semibold mb-1">
        하위 페이지가 감지되었어요
      </p>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        SEO/AEO 분석은 메인 페이지 기준이 더 정확해요.<br />
        어떤 페이지를 분석할까요?
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onAnalyzeRoot}
          className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl gradient-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <Globe className="w-4 h-4" />
          메인 페이지 분석하기
        </button>
        <button
          onClick={onAnalyzeCurrent}
          className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-input bg-background text-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <FileText className="w-4 h-4" />
          이 페이지 분석하기
        </button>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-[11px] text-muted-foreground truncate">
          <span className="font-medium">메인:</span> {rootUrl}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          <span className="font-medium">현재:</span> {inputUrl}
        </p>
      </div>
    </div>
  );
};

export default SubpageWarning;
