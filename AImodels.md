# توثيق نماذج الذكاء الاصطناعي في المشروع

هذا المستند هو المرجع الشامل لجميع نماذج الذكاء الاصطناعي من Google المستخدمة في هذا التطبيق. يهدف إلى توضيح قدرات كل نموذج، حدوده، وأفضل الممارسات لاستخدامه، مع أمثلة عملية وروابط للمصادر الرسمية.

**المصدر الرئيسي للوثائق:** [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)

---

## 1. نماذج Gemini للمهام العامة والمتعددة الوسائط

هذه النماذج تشكل العمود الفقري للتطبيق، قادرة على فهم ومعالجة أنواع مختلفة من البيانات.

### 1.1. `gemini-2.5-pro` (النموذج المتقدم)

*   **الوصف:** النموذج الأكثر قوة وذكاءً، مصمم للمهام المعقدة التي تتطلب استنتاجًا وتحليلاً عميقًا.
*   **المصدر:** [Gemini Models Documentation](https://ai.google.dev/gemini-api/docs/models#gemini-2.5-pro)
*   **القدرات الرئيسية:**
    *   **مدخلات متعددة الوسائط:** يقبل ويعالج نصوص، صور، مقاطع فيديو، ملفات صوتية، وملفات PDF.
    *   **مخرجات نصية:** يقوم بتوليد ردود نصية مفصلة.
    *   **سياق طويل:** يمكنه معالجة كميات هائلة من المعلومات تصل إلى مليون توكن.
    *   **متصل بالإنترنت:** يدعم استخدام `Google Search` لجلب معلومات حديثة وتضمينها في الإجابات.
    *   **استدعاء الدوال (Function Calling):** يمكنه التفاعل مع أنظمة خارجية عبر استدعاء دوال محددة.
*   **حالات الاستخدام في التطبيق:**
    *   **تدقيق الحقائق (`factCheckText`):** تحليل النصوص وربط الادعاءات بمصادر من بحث جوجل.
    *   **استخراج النصوص من PDF (`extractTextFromPdf`):** قراءة ملفات PDF واستخراج النصوص منها، بما في ذلك النصوص داخل الصور (OCR).
    *   **كتابة نصوص البودكاست (`generatePodcastScript`):** إنشاء حوارات وسيناريوهات معقدة.
*   **حدود الاستخدام:**
    *   **حد الإدخال:** 1,048,576 توكن.
    *   **حد الإخراج:** 65,536 توكن.
*   **مثال الكود (استخراج نص من PDF):**
    ```typescript
    // From: services/geminiService.ts

    async function extractTextFromPdf(base64Pdf: string, mimeType: string) {
      const ai = getAiInstance();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [ { parts: [ { inlineData: { mimeType, data: base64Pdf } }, { text: "Extract text from this PDF." } ] } ],
      });
      // ... processing logic
    }
    ```

### 1.2. `gemini-2.5-flash` (النموذج السريع)

*   **الوصف:** نموذج متوازن يجمع بين السرعة والكفاءة، مثالي للمهام ذات الحجم الكبير والتي تتطلب استجابة سريعة.
*   **المصدر:** [Gemini Models Documentation](https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash)
*   **القدرات الرئيسية:**
    *   **مدخلات متعددة الوسائط:** مثل `pro`، يقبل ويعالج نصوص، صور، مقاطع فيديو، وملفات صوتية.
    *   **متصل بالإنترنت:** يدعم استخدام `Google Search` لجلب معلومات حديثة.
    *   **محسّن للسرعة:** مصمم لتقديم استجابات سريعة بتكلفة أقل.
*   **حالات الاستخدام في التطبيق:**
    *   **البحث (`searchWithGemini`):** توليد إجابات سريعة مدعومة ببحث جوجل.
    *   **تحليل النصوص (`analyzeTextWithGemini`):** استخراج سريع للمشاعر والكيانات والملخصات.
    *   **وصف الصور (`describeImage`):** تحليل محتوى صورة وتقديم وصف نصي لها.
    *   **المحادثة (`chatOnFileContentStream`):** إجراء محادثة تفاعلية وسريعة بناءً على محتوى مستند.
*   **حدود الاستخدام:**
    *   **حد الإدخال:** 1,048,576 توكن.
    *   **حد الإخراج:** 65,536 توكن.
*   **مثال الكود (وصف صورة):**
    ```typescript
    // From: services/geminiService.ts

    async function describeImage(base64Image: string) {
        const ai = getAiInstance();
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
        const textPart = { text: "Describe this image in detail." };
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        return response.text;
    }
    ```

---

## 2. نماذج توليد الصور (Imagen)

نموذج متخصص في إنشاء صور فنية وواقعية عالية الجودة من خلال الأوصاف النصية.

### `imagen-4.0-generate-001`

*   **الوصف:** أحدث نماذج توليد الصور من Google، قادر على فهم الأوصاف المعقدة وإنتاج صور عالية الدقة.
*   **المصدر:** [Imagen Documentation](https://ai.google.dev/gemini-api/docs/imagen)
*   **القدرات الرئيسية:**
    *   **جودة عالية:** إنشاء صور واقعية أو فنية بتفاصيل دقيقة.
    *   **توليد نصوص:** يمكنه كتابة نصوص قصيرة داخل الصور.
    *   **تحكم دقيق:** يدعم التحكم في نسبة أبعاد الصورة (`aspectRatio`)، عدد الصور (`numberOfImages`)، والمحتوى (مثل السماح بظهور الأشخاص).
    *   **فهم الأسلوب:** يفهم الأساليب الفنية (مثل "لوحة زيتية") ومصطلحات التصوير الفوتوغرافي (مثل "عدسة ماكرو"، "إضاءة دافئة").
*   **حالات الاستخدام في التطبيق:**
    *   **توليد الصور (`generateImages`):** إنشاء مجموعة من الصور بناءً على طلب المستخدم.
*   **حدود الاستخدام:**
    *   **لغة الإدخال:** الإنجليزية فقط حاليًا.
    *   **حد الإدخال (النص):** 480 توكن.
    *   **حد الإخراج (الصور):** 1 إلى 4 صور لكل طلب.
*   **مثال الكود (توليد صورة بنسبة أبعاد محددة):**
    ```typescript
    // From: services/geminiService.ts

    async function generateImages(query: string) {
      const ai = getAiInstance();
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Photorealistic image of: ${query}. Focus on high detail and cinematic lighting.`,
        config: {
          numberOfImages: 4,
          aspectRatio: '16:9', // Example of a specific parameter
        },
      });
      return response.generatedImages;
    }
    ```

---

## 3. نماذج توليد الصوت (TTS)

نموذج متخصص في تحويل النص إلى كلام مسموع بجودة عالية.

### `gemini-2.5-flash-preview-tts`

*   **الوصف:** نموذج فعال وسريع لتوليد الصوت، مع ميزات متقدمة مثل دعم أصوات متعددة.
*   **المصدر:** [Gemini Models Documentation (TTS)](https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-tts)
*   **القدرات الرئيسية:**
    *   **جودة عالية:** ينتج صوتًا واضحًا وطبيعيًا.
    *   **دعم أصوات متعددة:** يمكن تحديد أصوات مسبقة الصنع (`prebuiltVoiceConfig`).
    *   **دعم متحدثين متعددين:** يمكنه إنتاج مقطع صوتي واحد يحتوي على حوار بين شخصين أو أكثر، مع تخصيص صوت لكل متحدث (`multiSpeakerVoiceConfig`).
*   **الأصوات المتاحة (Pre-built Voices):**
    *   لا توجد قائمة رسمية شاملة حتى الآن، ولكن بناءً على أمثلة من وثائق مختلفة، هذه بعض الأصوات المتاحة:
    *   **مجموعة Firebase/Genkit:** `Algenib`, `Achernar`.
    *   **مجموعة Gemini Live API:** `Puck`, `Charon`, `Kore`, `Fenrir`, `Aoede`, `Leda`, `Orus`, `Zephyr`.
    *   *ملاحظة: يجب اختبار هذه الأصوات للتأكد من توافرها في `gemini-2.5-flash-preview-tts`.*
*   **حالات الاستخدام في التطبيق:**
    *   **توليد الكلام (`generateSpeech`):** تحويل سطر نصي واحد إلى صوت.
    *   **توليد بودكاست (`generateMultiSpeakerSpeech`):** تحويل سيناريو كامل لحوار بين شخصين إلى مقطع صوتي واحد متكامل.
*   **حدود الاستخدام:**
    *   **حد الإدخال:** 8,000 توكن.
    *   **حد الإخراج:** 16,000 توكن.
*   **مثال الكود (توليد بودكاست):**
    ```typescript
    // From: services/geminiService.ts

    async function generateMultiSpeakerSpeech(script: PodcastScriptLine[], maleVoice: string, femaleVoice: string) {
      const ai = getAiInstance();
      const prompt = script.map(line => `${line.speaker}: ${line.line}`).join('\\n');

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: maleVoice } } },
                { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: femaleVoice } } }
              ]
            }
          }
        }
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    }
    ```

---

## 4. التعامل مع الملفات والروابط

تسمح نماذج Gemini بمعالجة الملفات والروابط مباشرة، مما يفتح إمكانيات قوية لتحليل المحتوى متعدد الوسائط.

### 4.1. رفع ومعالجة الملفات (Files API)

*   **الوصف:** واجهة برمجية مخصصة لرفع الملفات الكبيرة (صور، صوت، فيديو، PDF) لتكون متاحة للتحليل بواسطة نماذج Gemini. يجب استخدامها عندما يتجاوز حجم الطلب 20 ميجابايت.
*   **المصدر:** [Files API Documentation](https://ai.google.dev/gemini-api/docs/files)
*   **دورة حياة الملف:**
    1.  **الرفع:** يتم رفع الملف باستخدام `client.files.upload()`.
    2.  **المعالجة:** يتم استخدام `file.uri` المرجع للملف في طلبات `generateContent`.
    3.  **الحذف:** يتم حذف الملفات تلقائيًا بعد 48 ساعة، أو يمكن حذفها يدويًا.
*   **حدود الاستخدام:**
    *   **سعة تخزين المشروع:** 20 جيجابايت.
    *   **حجم الملف الواحد:** 2 جيجابايت.
*   **أنواع الملفات المدعومة (MIME Types):**
    *   **فيديو:** `video/mp4`, `video/mpeg`, `video/mov`, `video/avi`, `video/x-flv`, `video/mpg`, `video/webm`, `video/wmv`, `video/3gpp`
    *   **صوت:** `audio/mpeg`, `audio/wav`, `audio/aac`, etc.
    *   **صور:** `image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif`
    *   **نصوص:** `text/plain`, `text/html`, `text/css`, `text/javascript`, `application/json`, `text/csv`, etc.
    *   **مستندات:** `application/pdf`
*   **مثال الكود (تلخيص فيديو مرفوع):**
    ```typescript
    import { getAiInstance } from "./services/geminiService";

    async function summarizeUploadedVideo(filePath: string, mimeType: string) {
        const ai = getAiInstance();

        // 1. Upload the file
        const uploadedFile = await ai.files.upload({
            file: filePath,
            config: { mimeType },
        });

        // 2. Use the file URI in the prompt
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                { fileData: { uri: uploadedFile.uri, mimeType: uploadedFile.mimeType } },
                { text: "Summarize this video in five bullet points." }
            ],
        });

        // 3. (Optional) Delete the file after use
        await ai.files.delete({ name: uploadedFile.name });

        return response.text;
    }
    ```

### 4.2. فهم المحتوى من الروابط

*   **الوصف:** يمكن للنماذج تحليل المحتوى مباشرة من روابط الويب، ولكن الطريقة تختلف حسب نوع الرابط.
*   **أ. روابط الويب العامة (HTML, PDF, etc.):**
    *   **الطريقة:** تستخدم أداة `URL Context Tool`.
    *   **المصدر:** [URL Context Documentation](https://ai.google.dev/gemini-api/docs/url-context)
    *   **القدرات:** مقارنة محتوى صفحات، تلخيص مقالات، استخراج معلومات.
    *   **ملاحظة هامة:** هذه الطريقة **لا تدعم** روابط يوتيوب.
*   **ب. روابط فيديوهات يوتيوب:**
    *   **الطريقة:** يتم تمرير رابط يوتيوب مباشرة كـ `file_data` في الطلب، بنفس طريقة التعامل مع الملفات المرفوعة.
    *   **المصدر:** [Video Understanding Documentation](https://ai.google.dev/gemini-api/docs/video-understanding#youtube)
    *   **القدرات:** تلخيص الفيديو، الإجابة على أسئلة حول محتواه، تفريغ الصوت، والإشارة إلى طوابع زمنية محددة.
*   **مثال الكود (تلخيص فيديو يوتيوب):**
    ```typescript
    import { getAiInstance } from "./services/geminiService";

    async function summarizeYoutubeVideo(youtubeUrl: string) {
      const ai = getAiInstance();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { text: 'Please summarize the video in 3 sentences.' },
          { fileData: { fileUri: youtubeUrl } }
        ]
      });
      return response.text;
    }
    ```