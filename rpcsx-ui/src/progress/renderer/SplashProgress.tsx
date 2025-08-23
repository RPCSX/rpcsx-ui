import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as api from "$";

interface ProgressProps {
    hidden?: boolean;
    channel: number;
}

export interface ProgressRef {
    hide: () => void;
    show: () => void;
}

enum ProgressStatus {
    InProgress = "InProgress",
    Complete = "Complete", 
    Error = "Error"
}

const Progress = forwardRef<ProgressRef, ProgressProps>(({ 
    hidden = false, 
    channel 
}, ref) => {
    const progressElementRef = useRef<HTMLSpanElement>(null);
    const hiddenRef = useRef(hidden);

    useImperativeHandle(ref, () => ({
        hide: () => {
            hiddenRef.current = true;
            if (progressElementRef.current) {
                progressElementRef.current.classList.remove("modal-show");
                progressElementRef.current.classList.add("modal-hide-fast");
            }
        },
        show: () => {
            hiddenRef.current = false;
            if (progressElementRef.current) {
                progressElementRef.current.classList.remove("modal-hide-fast");
                progressElementRef.current.classList.add("modal-show");
            }
        }
    }));

    useEffect(() => {
        if (!window.electron) return;

        // Mock API calls - these would need to be implemented properly
        const handleProgressUpdate = (event: any) => {
            if (progressElementRef.current) {
                progressElementRef.current.animate(
                    [
                        { width: progressElementRef.current.style.width },
                        { width: `${event.value}%` },
                    ],
                    {
                        duration: 600,
                        iterations: 1,
                        fill: "forwards" as FillMode,
                        easing: "ease-in-out",
                    }
                );

                if (
                    event.value.status === ProgressStatus.Error ||
                    event.value.status === ProgressStatus.Complete
                ) {
                    // setTimeout(() => hide(), 1500);
                }
            }
        };

        api.onProgressUpdate(handleProgressUpdate);
        api.progressSubscribe({ channel });

        return () => {
            api.progressUnsubscribe({ channel });
        };
    }, [channel]);

    return (
        <div
            className="progress-bar shadow-xl m-10 shadow-white"
            style={{ display: hidden ? "none" : "block" }}
        >
            <span className="bg-white rounded progress-fg" ref={progressElementRef}>
                <span className="progress-bg"> </span>
            </span>
        </div>
    );
});

Progress.displayName = "Progress";

export default Progress;
