import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Info,
    Camera,
    Mic,
    Clock,
    Shield,
    ArrowRight,
} from "lucide-react";

export default function InterviewInstructions() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-card/20 to-background flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl w-full glass-card rounded-3xl border border-border/50 p-8"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold">
                        AI Intro Practice
                    </h1>

                    <p className="mt-4 max-w-xl mx-auto text-center text-base leading-7 text-amber-400 font-semibold">
                        Please read the following instructions carefully before starting your
                        intro practice.
                    </p>
                </div>

                <div className="space-y-5">

                    <div className="flex gap-4">
                        <Camera className="text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold">Camera</h3>
                            <p className="text-muted-foreground text-sm">
                                Keep your face clearly visible throughout the interview.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Mic className="text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold">Microphone</h3>
                            <p className="text-muted-foreground text-sm">
                                Speak clearly. After 6 seconds of silence your answer will be
                                submitted automatically.
                            </p>
                        </div>
                    </div>


                    <div className="flex gap-4">
                        <Shield className="text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold">Important</h3>
                            <p className="text-muted-foreground text-sm">
                                Do not refresh or close the browser while the interview is in
                                progress.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Info className="text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold">Before You Start</h3>
                            <p className="text-muted-foreground text-sm">
                                Ensure you are in a quiet environment with a stable internet
                                connection.
                            </p>
                        </div>
                    </div>

                </div>

                <div className="mt-10 flex justify-end">
                    <button
                        onClick={() => navigate("/intro-practice")}
                        className="px-8 py-3 rounded-xl bg-primary text-primary-foreground flex items-center gap-2 hover:opacity-90"
                    >
                        Start Intro Practice
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}