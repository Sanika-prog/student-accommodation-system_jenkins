pipeline {
    agent any

    environment {
        REGISTRY_CREDS = 'docker-hub-credentials'
        IMAGE_NAME     = "sanikaprog/student-accommodation-system"
        IMAGE_TAG      = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                nodejs('Node-18') { 
                    sh 'npm ci'
                }
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Test') {
            steps {
                nodejs('Node-18') {
                    sh 'npm test'
                }
            }
        }

        stage('Code Quality') {
            steps {
                nodejs('Node-18') {
                    sh 'npm run lint || true'
                }
                withSonarQubeEnv('SonarQube') {
                    sh 'npx sonar-scanner'
                }
            }
        }

        stage('Security') {
            steps {
                nodejs('Node-18') {
                    sh 'npm audit --audit-level=high || true'
                }
                sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL ${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker-compose down'
                sh 'docker-compose up -d --build'
            }
        }

        stage('Release') {
            steps {
                sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest"
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDS}", usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                    sh "docker login -u ${USER} -p ${PASS}"
                    sh "docker push ${IMAGE_NAME}:${IMAGE_TAG}"
                    sh "docker push ${IMAGE_NAME}:latest"
                }
            }
        }

        stage('Monitoring') {
            steps {
                sh 'sleep 15'
                sh 'curl -f http://localhost:5000/health'
                sh 'curl -f http://localhost:5000/metrics'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
        failure {
            echo 'Pipeline failed — check stage logs above.'
        }
    }
}
